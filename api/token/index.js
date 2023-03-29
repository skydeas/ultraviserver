const express = require('express');
const router = express.Router();
const config = require('../../config/development');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const auth = require('../../auth');
const multer = require('multer');
const connectionPool = mysql.connectionPool;
const mailer = require('../mailer')

// =================== Middlewares for password reset token ===========================

const deleteTemporaryFile = function(req, res, next){
    // Delete temporary file
    fs.unlinkSync('./temp/' + req.file.filename);
}

function replaceSpecialCharacters(str) {
    const regex = /['"\\\0\\\r\\\n\\\t\\\v\\\b\\\f&<>%*;[\]{}!:#^$~|\/?]/g;
    return str.replace(regex, "");
}

// Middleware function to ensure filename does not contain spaces nor any '.pdf'
const sanitizeData = function (req, res, next) {
    // Remove any instance of .pdf from filename
    let newFilename = req.body.formFilename;
    newFilename = newFilename.replace(/\.pdf/g, ''); // remove any instance of '.pdf' from the filename
    req.body.formFilename = newFilename;

    req.body.formDocname = replaceSpecialCharacters(req.body.formDocname);
    req.body.formFilenameSanitized = replaceSpecialCharacters(req.body.formFilename);
    req.body.formTitle = replaceSpecialCharacters(req.body.formTitle);
    req.body.formVersion = replaceSpecialCharacters(req.body.formVersion);

    next();
}

// Middleware function to save the actual entry on our document database
const saveToDatabase = function(req, res, next) {
    console.log('saveToDatabase: ', req.body);
    // Set our default value for ver field
    if(req.body.formVersion == '') req.body.formVersion = 'None';

    connectionPool.query(config.queries.addDocumentQuery,
        [
            0, // Seq
            req.body.formDocname,
            req.body.formFilenameSanitized +  '.pdf',
            req.body.formTitle,
            req.body.formVersion,
            1, // active
            req.body.formEffective,
            req.body.formUpdated
        ], (err, response) => {
        if (err) {
            console.log("Query Error: ", err);
            return res.status(500).send({ message: 'Internal Server Error' });
        }
        // console.log("File added successfully");
        next();
    });
}

// Middleware function that ensures that the username and email from the request are:
// - Active,
// - Username and Email match
// This is to reduce spam and ensure reliability of the system.
const isUserValid = function(req, res, next) {
    connectionPool.query('SELECT COUNT(*) AS count FROM users WHERE username = ? AND email = ? AND active = ?;' , [req.body.username, req.body.email, 'Y'], (err, rows) => {
        if (err) {
            console.log("Query Error: ", err);
            return res.status(500).send({ message: 'Internal Server Error' });
        }

        // check if an entry exists
        if (rows[0].count > 0) {
            // an entry exists for the matching set of username and email
            console.log('entry exists for that user AND they are valid');
            next();
        } else {
            // no entry exists
            console.log('reject the operation.')
            return res.status(403).send({ message: 'User could not be validated' });
        }  
    });
}

// Middleware function that ensures that sees if there is an ACTIVE token for the email that has been requested
const checkForActiveToken = function(req, res, next) {
    connectionPool.query(config.queries.selectAllPasswordResetTokensQuery + ' WHERE user_email = ?;', [req.body.email], (err, tokens) => {
        if (err) {
            console.log("Query Error: ", err);
            return res.status(500).send({ message: 'Internal Server Error' });
        }

        console.log(tokens);
        if (tokens.length > 0) {
            // There is a token, it can either be expired or valid:
            console.log('Token detected, checking for expiration.')
            let token = tokens[0];
            // Slicing the last 3 digits off of our timestamp so we can store it in our SQL Server. This will be how we handle
            // Date.Now() in the system. 
            let timestamp = parseInt(Date.now().toString().slice(0, -3))

            // console.log('token expiration: ', token.expiration);
            // console.log('Date.Now():  ', timestamp);

            if(token.expiration < timestamp){
                console.log('Token is expired! We will delete it from our server and give you a password reset email!');
                deleteTokenFromDatabase(token.id);
                next();
            } else {
                console.log('Token is valid! Please check your email for the password reset link!');
                return res.status(403).send({ message: 'Active token in the system'});
            }
        } else {
            // no token with matching email.
            console.log('no token, proceed.')
            next();
        } 
    });
}


router.post("/requestPasswordReset", isUserValid, checkForActiveToken, async (req, res) => {
    // Create the timestamp we will use for our expiration date.
    let timestamp = parseInt(Date.now().toString().slice(0, -3))
    // you can change that for 15 minutes from now by adding 900 (15 minutes in seconds)
    timestamp = timestamp + 900;
    // email in the form.
    let user_email = req.body.email;
    
    // Save token to database:
    connectionPool.query(config.queries.addPasswordResetTokenQuery, [timestamp, user_email], (err, tokens) => {
        if (err) {
            console.log("Query Error: ", err);
            return res.status(500).send({ message: 'Internal Server Error' });
        }
        // console.log('tokens: ', tokens);

        const jwtBearerToken = jwt.sign({
            id: tokens.insertId,
            expiration: timestamp,
            email: user_email,
        }, config.privateKey, {
            algorithm: 'RS256',
            expiresIn: '15m',
        });

        // We have created the entry on our database! send the email to the user.
        sendPasswordResetEmail(jwtBearerToken ,user_email);

        return res.status(200).send({'message':'success'});
    });
});

router.post("/submitRequestPasswordReset", async (req, res) => {
    jwt.verify(req.body.token, config.privateKey, (err, decoded) => {
        if(err){
            if(err.name === 'TokenExpiredError'){
                connectionPool.query(config.queries.deletePasswordResetTokenByEmailQuery, [req.body.email], (err, results) => {
                    return res.status(500).send({ message: 'Token has expired' });
                });
            }
            if(err.name === 'JsonWebTokenError'){
                return res.status(500).send({ message: 'Invalid token' });
            }
        }
        if (decoded !== undefined) {
            // There are no errors, Now we are going to check to see if the email on the token matches the email submitted,
            // If error, return error and log it, 
            // If success, change the password.
            if(decoded.email !== req.body.email){
                return res.status(500).send({ message: 'Email mismatch' });
            } else {
                // Emails do NOT mismatch, meaning we can set our new password!
                // If we wanted to validate we would do it here, but let's just update the password and then DELETE the token.
                connectionPool.query(config.queries.updateUserPasswordByEmailQuery, [req.body.password, req.body.email], (err, results) => {
                    // DELETE the token
                    deleteTokenFromDatabase(decoded.id);
                    return res.status(200).send({'message':'success'});
                });
            }
        }
    })
});

router.post("/verifyToken", async (req, res) => {
    jwt.verify(req.body.token, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
        }
        if (decoded !== undefined) {
            // API Route to get all tasks available to the ID passed in the parameter.
            connectionPool.query(config.queries.allTasksAvailableToUserById, [decoded._id], (err, results) => {
                return res.status(200).send({'message':'success'});
            });
        }
    })
});

// Function to delete a token by the token id. (In case a token is expired, or already used.);
let deleteTokenFromDatabase = function (token_id){
    connectionPool.query(config.queries.deletePasswordResetTokenQuery, [token_id], (err, tokens) => {
        if (err) {
            console.log("Query Error: ", err);
            return res.status(500).send({ message: 'Internal Server Error' });
        }

        console.log('token with id: ' + token_id + ' was deleted.');
    });
}

// Function to send an email to the user requesting the password change.
let sendPasswordResetEmail = function(_token, user_email){
    let message = {
        from: 'mdambrosio@ultravi.com',
        to: user_email,
        subject: 'Ultravi Portal Password Reset Request',
        html: 
        `<html>
            <head>
            <title>Password Reset</title>
            <style>
                /* Add your styles here */
                .container {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                background-color: #f5f5f5;
                border-radius: 10px;
                padding: 20px;
                }
                .title {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
                }
                .message {
                font-size: 16px;
                margin-bottom: 20px;
                }
                .button {
                display: inline-block;
                background-color: #4CAF50;
                color: #fff;
                padding: 10px 20px;
                text-decoration: none;
                border-radius: 5px;
                }
            </style>
            </head>
            <body>
            <div class="container">
                <h1 class="title">Password Reset</h1>
                <p class="message">
                If you've lost your password, or wish to reset it, use the link below to get started.
                </p>
                <a class="button" href="192.168.1.132:4200/reset-password-request?token=${_token}">Reset Password</a>
            </div>
            </body>
        </html>
        `,
    };
    // REMOVING HTTPS FROM THE LINK, WE NEED TO ADD IT BACK WHEN WE HAVE THE APP HOSTED.

    config.mail_transporter.sendMail(message, (error, info) => {
        if (error) {
            console.log(error);
            res.status(500).send(error)
        } else {
            console.log('Email sent: ' + info.response);
            res.status(200).send(info.response)
        }
    });
}

module.exports = router;
const express = require('express');
const router = express.Router();
const config = require('../../config/development');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const auth = require('../../auth');
const multer = require('multer');
const connectionPool = mysql.connectionPool;
const mailer = require('../mailer')

// =================== Middlewares ===========================

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

/**
 * Route that retrieves all of the entries from our rules table.
 * We will do the filtering client-side.
 */
router.get("/getRules", auth.authenticateRequest(20), async (req, res) => {
   
    // Save token to database:
    connectionPool.query(config.queries.selectAllFlightScheduleRulesQuery, (err, ruleList) => {
        if (err) {
            console.log("Query Error: ", err);
            return res.status(500).send({ message: 'Internal Server Error' });
        }
        
        return res.status(200).send(ruleList);
    });
});

/**
 * Route that retrieves all of the entries from our rules table.
 * We will do the filtering client-side.
 */
router.post("/createRule", auth.authenticateRequest(20), multer().none(), async (req, res) => {
    console.log(req.body);
   
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        connectionPool.query(config.queries.createFlightScheduleRuleQuery, 
        [
            boolToNumber(req.body.formRecurring),
            req.body.formDate_start,
            req.body.formDate_end,
            req.body.formAirline,
            req.body.formClient,
            req.body.formRemarks,
            req.body.formFlight_number,
            0, // Flight # out, not used, will delete
            req.body.formScheduled_arrival_time,
            req.body.formScheduled_departure_time,
            req.body.formArrival_city,
            req.body.formDeparture_city,
            boolToNumber(req.body.formMonday),
            boolToNumber(req.body.formTuesday),
            boolToNumber(req.body.formWednesday),
            boolToNumber(req.body.formThursday),
            boolToNumber(req.body.formFriday),
            boolToNumber(req.body.formSaturday),
            boolToNumber(req.body.formSunday)
        ], (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                responseSent = true;
                return res.status(500).send({ message: 'Internal Server Error' });
            }
            // console.log(response);
            return res.status(200).send(response);
        });  
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

function boolToNumber(boolString) {
    tempBool = JSON.parse(boolString);
    if(tempBool){
        return 1;
    } else {
        return 0;
    }
}


module.exports = router;
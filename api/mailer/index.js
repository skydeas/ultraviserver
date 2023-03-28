const express = require('express');
const router = express.Router();
const config = require('../../config/development');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const auth = require('../../auth/');
const multer = require('multer');

const connectionPool = mysql.connectionPool;


/**
 * Route to create an airport on the database
 */
router.get("/send", async (req, res) => {

    let message = {
        from: 'mdambrosio@ultravi.com',
        to: 'marcodambrosio96@gmail.com',
        subject: 'Test email from Node.js',
        // text: 'Hello from Node.js! This is sent from the application.'
        // href="https://your-site.com/reset-password?token=abc123"
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
                <a class="button" href="http://localhost:4200/user/manageusers">Reset Password</a>
            </div>
            </body>
        </html>
        `,
    };

    
    
    config.mail_transporter.sendMail(message, (error, info) => {
        if (error) {
            console.log(error);
            res.status(500).send(error)
        } else {
            console.log('Email sent: ' + info.response);
            res.status(200).send(info.response)
        }
    });
    

    // res.status(200).send(info.response);
});

module.exports = router;
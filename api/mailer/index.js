const express = require('express');
const router = express.Router();
const config = require('../../config/development');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const auth = require('../../auth/');
const multer = require('multer');
const nodemailer = require('nodemailer');

const connectionPool = mysql.connectionPool;

let transporter = nodemailer.createTransport({
    host: 'mail.ultravi.com',
    port: 465,
    secure: true,
    auth: {
        user: 'mdambrosio@ultravi.com',
        pass: 'tmw5*lvcd.vi'
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 20000
});

/**
 * Route to create an airport on the database
 */
router.get("/send", async (req, res) => {

    let message = {
        from: 'mdambrosio@ultravi.com',
        to: 'mdambrosio@ultravi.com',
        subject: 'Test email from Node.js',
        text: 'Hello from Node.js! This is sent from the application.'
    };

    /*
    transporter.sendMail(message, function(error, info) {
        if (error) {
            console.log(error);
            res.status(500).send(error)
        } else {
            console.log('Email sent: ' + info.response);
            res.status(200).send(info.response)
        }
    });
    */
    res.status(200).send(info.response);
});

module.exports = router;
const express = require('express');
const router = express.Router();
const config = require('../../config/development');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const auth = require('../../auth/');
const multer = require('multer')

//#region  ============================= Middlewares ==========================

//#endregion


const connectionPool = mysql.connectionPool;

/**
 * Route to create an airport on the database
 */
router.post("/createAirport", multer().none(), async (req, res) => {
    console.log(req.body)
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.addAirportQuery, 
        [
            req.body.formIATA,
            req.body.formICAO,
            req.body.formAirportName,
            req.body.formCity,
            req.body.formCountry,
            req.body.formLatitude,
            req.body.formLongitude,
            req.body.formAltitude,
            req.body.formTZ
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


/**
 * Route to get ALL airports from database
 */
router.get("/getAirports", async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.selectAllAirportsQuery, (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                responseSent = true;
                return res.status(500).send({ message: 'Internal Server Error' });
            }
            // console.log(response);
            res.json(response);
        });  
    })
});

/**
 *  Route to get a specific airport from the database
 */ 
router.get("/getAirport/:id", async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.selectAllAirportsQuery + " WHERE id=?", [req.params.id], (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                responseSent = true;
                return res.status(500).send({ message: 'Internal Server Error' });
            }
            // console.log(response);
            res.json(response);
        });  
    })
            
});

module.exports = router;
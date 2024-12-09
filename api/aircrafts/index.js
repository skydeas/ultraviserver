const express = require('express');
const router = express.Router();
const config = require('../../config/development');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const auth = require('../../auth');
const multer = require('multer')
const moment = require('moment');
const logger = require('../../logger');


//#region  ============================= Middlewares ==========================

//#endregion


const connectionPool = mysql.connectionPool;

/**
 * Route to create an airline on the database
 */
router.post("/createAircraft", auth.authenticateRequest(26),  multer().none(), async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.addAircraftQuery, 
        [
            req.body.formAc_type,
            req.body.formAc_reg,
            req.body.formAirline
        ], (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                responseSent = true;
                // Handle duplicate key 
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).send({ message: 'Duplicate entry detected', details: err.sqlMessage });
                } 
            
                // Generic error handling
                return res.status(500).send({ message: 'Internal Server Error' });
            }
            // Log that a user has created an aircraft:
            const dataToAppend = { action: 'create aircraft', username: decoded._username, id: decoded._id, timestamp: moment().unix(), readableTimestamp:moment.unix(Date.now() / 1000).format('YYYY-MM-DD HH:mm:ss'), requestBody: req.body };
            const arrayName = 'aircrafts'; // Name of the array in the JSON file

            logger.writeToLogFile(dataToAppend, arrayName);

            // console.log(response);
            return res.status(200).send(response);
        });  
    })
});

/**
 * Route to update an airline on the database
 */
router.post("/updateAircraft/:id", auth.authenticateRequest(26), multer().none(), async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.updateAircraftQuery, 
            // SET IATA=?,ICAO=?,AircraftName=?,City=?,Country=?,Latitude=?,Longitude=?,Altitude=?,TZ=? WHERE id=?
        [ 
            req.body.formAc_type,
            req.body.formAc_reg,
            req.body.formAirline,
            req.params.id
        ], (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                responseSent = true;
                return res.status(500).send({ message: 'Internal Server Error' });
            }

            // Log that a user has updated an aircraft:
            const dataToAppend = { action: 'update aircraft', username: decoded._username, id: decoded._id, timestamp: moment().unix(), readableTimestamp:moment.unix(Date.now() / 1000).format('YYYY-MM-DD HH:mm:ss'), requestBody: req.body };
            const arrayName = 'aircrafts'; // Name of the array in the JSON file

            logger.writeToLogFile(dataToAppend, arrayName);
            // console.log(response);
            return res.status(200).send(response);
        });  
    })
});


/**
 * Route to get ALL airlines from database
 */
router.get("/getAircrafts", auth.authenticateRequest(25),  async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.selectAllAircraftsQuery, (err, response) => {
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
 * Route to get ALL ac types from database
 */
router.get("/getAc_types", auth.authenticateRequest(25),  async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.selectAllAc_typesQuery, (err, response) => {
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
 *  Route to get a specific airline from the database
 */ 
router.get("/getAircraft/:id", auth.authenticateRequest(25),  async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.selectAllAircraftsQuery + " WHERE id=?", [req.params.id], (err, response) => {
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
 *  Route to get a specific airline from the database
 */ 
router.get("/deleteAircraft/:id", auth.authenticateRequest(26), async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.deleteAircraftQuery, [req.params.id], (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                responseSent = true;
                return res.status(500).send({ message: 'Internal Server Error' });
            }
            
            // Log that a user has deleted an aircraft:
            const dataToAppend = { action: 'delete aircraft', username: decoded._username, id: decoded._id, timestamp: moment().unix(), readableTimestamp:moment.unix(Date.now() / 1000).format('YYYY-MM-DD HH:mm:ss'), requestBody: req.body, requestParams: req.params };
            const arrayName = 'aircrafts'; // Name of the array in the JSON file

            logger.writeToLogFile(dataToAppend, arrayName);



            // console.log(response);
            res.json(response);
        });  
    })   
});
module.exports = router;
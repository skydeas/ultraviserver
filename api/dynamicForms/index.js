const express = require('express');
const router = express.Router();
const config = require('../../config/development');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const auth = require('../../auth');
const multer = require('multer')
const moment = require('moment');
const logger = require('../../logger');
const constants = require('../../config/development');

//#region  ============================= Middlewares ==========================
let POVCity = 'MIA';
//#endregion

const connectionPool = mysql.connectionPool;

/**
 * Route that returns the schema of a table.
 */
router.post("/getTableSchema", multer().none(), async (req, res) => { // auth.authenticateRequest(44)
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        let getTableSchemaQuery = 
        `
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = '${constants.databaseName}' 
          AND TABLE_NAME = '${req.body.tableName}';
        `
        // console.log(getTableSchemaQuery)
        //  [req.body.remarks !== 'null' && req.body.remarks !== '' ? req.body.remarks : null,]
        connectionPool.query(getTableSchemaQuery, (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                return res.status(500).send({ message: 'Internal Server Error' });
            }
            console.log(response);
            res.status(200).send({message: 'success', response: response});
        }); 
    })
});

/**
 * Route that returns the data of a table.
 */
router.post("/getDropdownOptions", multer().none(), async (req, res) => { // auth.authenticateRequest(44)
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        let getTableSchemaQuery = 
        `SELECT * FROM ${constants.databaseName}.${req.body.tableName};`
        // console.log(getTableSchemaQuery)
        //  [req.body.remarks !== 'null' && req.body.remarks !== '' ? req.body.remarks : null,]
        connectionPool.query(getTableSchemaQuery, (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                return res.status(500).send({ message: 'Internal Server Error' });
            }
            console.log(response);
            res.status(200).send({message: 'success', response: response});
        }); 
    })
});

/** selectAllAdditionalServicesWithFilter
 *  Route to get a specific additional service using the flight id of the modal as the identifier.
 */ 
router.get("/getFacilities", async (req, res) => { //  auth.authenticateRequest(37),
    let facilities = config.facilities;
    return res.status(200).send(facilities);
});

router.get("/getBodyTypes", async (req, res) => { //  auth.authenticateRequest(37),
    let bodyTypes = config.aircraftBodyTypes;
    return res.status(200).send(bodyTypes);
});


module.exports = router;
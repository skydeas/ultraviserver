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
 * Route that returns the schema of a table.
 */
router.post("/getTable", multer().none(), async (req, res) => { // auth.authenticateRequest(44)
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

/**
 * Route that creates an add statement for the database based on the schema
 */
router.post("/dynamicAdd", express.json(), async (req, res) => { // auth.authenticateRequest(44) multer().none(),
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        // Filter out the 'id' column from the schema
        const filteredSchema = req.body.schema.filter(column => column.COLUMN_NAME !== 'id');
        // Extract column names from schema
        const columnNames = filteredSchema.map(column => column.COLUMN_NAME);

        // Extract values from formData
        const values = columnNames.map(columnName => {
            // If formData value is empty string, replace it with NULL
            const value = req.body.formData[columnName] === '' ? 'NULL' : `'${req.body.formData[columnName]}'`;
            return value;
        });

        // Generate column names string for SQL query
        const columnsString = columnNames.join(', ');

        // Generate values string for SQL query
        const valuesString = values.join(', ');

        // Construct the INSERT query
        const insertQuery = `INSERT INTO ${req.body.tableName} (${columnsString}) VALUES (${valuesString})`;

        // console.log(getTableSchemaQuery)
        //  [req.body.remarks !== 'null' && req.body.remarks !== '' ? req.body.remarks : null,]
        connectionPool.query(insertQuery, (err, response) => {
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

/**
 * Route that returns the names of all tables in the databse. 
 * FILTERED IN THE SERVER SIDE TO PREVENT MALICIOUS ACCCESS TO SENSITIVE TABLES.
 */
router.get("/getTableNames", multer().none(), async (req, res) => { // auth.authenticateRequest(44)
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        let query = `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '${constants.databaseName}';`

        console.log(query)
        //  [req.body.remarks !== 'null' && req.body.remarks !== '' ? req.body.remarks : null,]
        connectionPool.query(query, (err, response) => {
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
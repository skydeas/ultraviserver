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
router.post("/getTableSchema", multer().none(), async (req, res) => {
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
        }

        // Query to fetch schema
        let getTableSchemaQuery = 
        `
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = '${constants.databaseName}' 
            AND TABLE_NAME = '${req.body.tableName}'
            ORDER BY ORDINAL_POSITION;
        `;

        // Query to fetch count
        let getCountQuery = `
            SELECT COUNT(*) AS count 
            FROM ${constants.databaseName}.${req.body.tableName};
        `;

        // Execute both queries
        connectionPool.query(getTableSchemaQuery, (err1, schemaResponse) => {
            if (err1) {
                console.log("Schema Query Error: ", err1);
                return res.status(500).send({ message: 'Internal Server Error' });
            }

            connectionPool.query(getCountQuery, (err2, countResponse) => {
                if (err2) {
                    console.log("Count Query Error: ", err2);
                    return res.status(500).send({ message: 'Internal Server Error' });
                }

                // Return both schema and count as a single object
                res.status(200).send({
                    schema: schemaResponse,
                    count: countResponse[0].count // Assuming countResponse is an array with a single object containing the count
                });
            });
        });
    });
});


/**
 * Route that returns the item from a table by id.
 */
router.post("/getItemFromTableById", multer().none(), async (req, res) => {
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
        }

        // Construct the SQL query using parameterized query to prevent SQL injection
        const query = `
            SELECT *
            FROM ${constants.databaseName}.${req.body.tableName}
            WHERE id = ${req.body.id}
        `;

        // Execute both queries
        connectionPool.query(query, (err1, response) => {
            if (err1) {
                console.log("Schema Query Error: ", err1);
                return res.status(500).send({ message: 'Internal Server Error' });
            }

            // Return both schema and count as a single object
            res.status(200).send({message: 'success', response: response});
        });
    });
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

        let getTableQuery = 
        `SELECT * 
        FROM ${constants.databaseName}.${req.body.tableName}
        LIMIT ${req.body.itemsPerPage} OFFSET ${req.body.pageOffset};`
        // console.log(getTableSchemaQuery)
        //  [req.body.remarks !== 'null' && req.body.remarks !== '' ? req.body.remarks : null,]
        connectionPool.query(getTableQuery, (err, response) => {
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
        // Extract column names and non-nullable status from schema
        const columnNames = filteredSchema.map(column => column.COLUMN_NAME);
        const nonNullableColumns = filteredSchema.filter(column => column.IS_NULLABLE === 'NO').map(column => column.COLUMN_NAME);

        // Generate column names string for SQL query
        const columnsString = columnNames.join(', ');
        
        // Extract values from formData and ensure proper SQL formatting
        const values = columnNames.map(columnName => {
            const value = req.body.formData[columnName];
            if (value === '' || value === null || value === undefined) {
                return 'NULL';
            } else {
                return `'${value.replace(/'/g, "''")}'`; // Escape single quotes in values
            }
        });

        console.log(values);

        // Check for null values in non-nullable fields
        const nullErrorFields = nonNullableColumns.filter(columnName => values[columnNames.indexOf(columnName)] === null);
        if (nullErrorFields.length > 0) {
            return res.status(400).send({ 
                message: 'Null values attempted in non-nullable fields',
                fields: nullErrorFields 
            });
        }

        const insertQuery = `INSERT INTO ${config.databaseName}.${req.body.tableName} (${columnsString}) VALUES (${values})`;
        console.log(insertQuery);
        // Construct the INSERT query
        // const insertQuery = `INSERT INTO ${req.body.tableName} (${columnsString}) VALUES (${valuesString})`;

         console.log(insertQuery)
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
 * Route that creates an update statement for the database based on the schema
 */
router.post("/dynamicUpdate", express.json(), async (req, res) => {
    jwt.verify(req.headers.logintoken, config.privateKey, async (err, decoded) => {
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
        }

        const filteredSchema = req.body.schema.filter(column => column.COLUMN_NAME !== 'id');
        // Extract column names and non-nullable status from schema
        const columnNames = filteredSchema.map(column => column.COLUMN_NAME);
        const nonNullableColumns = filteredSchema.filter(column => column.IS_NULLABLE === 'NO').map(column => column.COLUMN_NAME);

        // Extract values from formData
        const values = columnNames.map(columnName => {
            // If formData value is empty string, replace it with NULL
            const value = req.body.formData[columnName] === '' ? null : req.body.formData[columnName];
            return value;
        });

        // Check for null values in non-nullable fields
        const nullErrorFields = nonNullableColumns.filter(columnName => values[columnName.indexOf(columnName)] === null);
        if (nullErrorFields.length > 0) {
            return res.status(400).send({ 
                message: 'Null values attempted in non-nullable fields',
                fields: nullErrorFields 
            });
        }

        const updateColumns = columnNames.map(columnName => {
            // Get the value from the form data
            const value = req.body.formData[columnName];
            // Convert null values to SQL NULL
            const sqlValue = value === null ? 'NULL' : `'${value}'`;
            // Return the column assignment string
            return `${columnName} = ${sqlValue}`;
        });

        // Generate column assignments for SQL query
        const updateColumnAssignments = updateColumns.join(', ');

        // Construct the UPDATE query
        const updateQuery = `UPDATE ${req.body.tableName} SET ${updateColumnAssignments} WHERE id = ${req.body.formData.id}`;

        connectionPool.query(updateQuery, (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                return res.status(500).send({ message: 'Internal Server Error' });
            }
            console.log(response);
            res.status(200).send({ message: 'success', response: response });
        });
    });
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
            // console.log(response);
            res.status(200).send({message: 'success', response: response});
        }); 
    })
});

/**
 * Route that returns the data of a table.
 */
router.post("/dynamicDelete", multer().none(), async (req, res) => { // auth.authenticateRequest(44)
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        let deleteItemQuery =

        `DELETE FROM ${constants.databaseName}.${req.body.tableName} WHERE (id = ${req.body.itemId})`
        console.log(deleteItemQuery)
        //  [req.body.remarks !== 'null' && req.body.remarks !== '' ? req.body.remarks : null,]
        connectionPool.query(deleteItemQuery, (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                return res.status(500).send({ message: 'Internal Server Error' });
            }
            // console.log(response);
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
const express = require('express');
const router = express.Router();
const config = require('../../config/development');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const auth = require('../../auth');
const multer = require('multer')

//#region  ============================= Middlewares ==========================

//#endregion

const connectionPool = mysql.connectionPool;

/**
 * Route to create an Additional Service on the database
 */
router.post("/createAdditionalService", auth.authenticateRequest(32),  multer().none(), async (req, res) => {
    let responseSent = false;
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.addAdditionalService, 
        [
            //(clientId, serviceId, date, timeStart, timeEnd, flightId, remarks, equipmentId, isComplete, locationStart, locationEnd) VALUES (?,?,?,?,?,?,?,?,?,?,?);',
            req.body.clientId,
            req.body.airlineId,
            req.body.serviceId,
            req.body.date,
            req.body.timeStart,
            req.body.timeEnd,
            req.body.flightId,
            req.body.remarks,
            req.body.equipmentId,
            (req.body.isComplete === 'true' ? 1 : 0), // Mapping the string 'true' and 'false' to 0 and 1;
            req.body.locationStart,
            req.body.locationEnd,
            req.body.quantity,
        ], (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                responseSent = true;
                return res.status(500).send({ message: 'Internal Server Error' });
            }
            // console.log(response);

            // Access the insert ID from the response
            //const insertId = response.insertId;
            return res.status(200).send(response);
        });  
    })
});

/**
 *  Route to get a specific additional service using the flight id of the modal as the identifier.
 */ 
router.get("/getAdditionalServicesByFlightId/:id", auth.authenticateRequest(31),  async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.selectAllAdditionalServices + " WHERE flightId=?", [req.params.id], (err, response) => {
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
 *  Route to get a specific additional service using the flight id of the modal as the identifier.
 */ 
router.post("/getAdditionalServices", auth.authenticateRequest(31),  async (req, res) => {
    let responseSent = false;
    
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.selectAllAdditionalServices + `${(req.body.airlineSearchQuery === "-1" ? "" : " AND airlineId = " + parseInt(req.body.airlineSearchQuery, 10))}` + `${(req.body.clientSearchQuery === "-1" ? "" : " AND clientId = " + parseInt(req.body.clientSearchQuery, 10))}`,
            [
                req.body.selectedStartDate,
                req.body.selectedEndDate
            ],
            (err, response) => {
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
 *  Route to get the list of additional service types from the services table to populate drop-down select
 */ 
router.get("/getServiceTypes", auth.authenticateRequest(31),  async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.selectAllServices, [req.params.id], (err, response) => {
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
 * Route to update an additional service on the database
 */
router.post("/updateAdditionalService/:id", auth.authenticateRequest(32), multer().none(), async (req, res) => {
    let responseSent = false;
    console.log((req.body.isComplete ? 1 : 0))
    console.log(req.body.isComplete)

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.updateAdditionalService, 
            // SET clientId=?, serviceId=?, date=?, timeStart=?, timeEnd=?, flightId=?, remarks=?, equipmentId=?, isComplete=?, locationStart=?, locationEnd=? WHERE id=?',
            [ 
            req.body.clientId,
            req.body.airlineId,
            req.body.serviceId,
            req.body.date,
            req.body.timeStart,
            req.body.timeEnd,
            req.body.flightId,
            req.body.remarks,
            req.body.equipmentId,
            (req.body.isComplete === 'true' ? 1 : 0), // Mapping the string 'true' and 'false' to 0 and 1;
            req.body.locationStart,
            req.body.locationEnd,
            req.body.quantity,
            req.params.id
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
 * Route to get ALL airlines from database
 */
router.get("/getClients", auth.authenticateRequest(31),  async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.selectAllClientsQuery, (err, response) => {
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
router.get("/getClient/:id", auth.authenticateRequest(31),  async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.selectAllClientsQuery + " WHERE id=?", [req.params.id], (err, response) => {
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
router.get("/deleteAdditionalService/:id", auth.authenticateRequest(32), async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.deleteAdditionalService, [req.params.id], (err, response) => {
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
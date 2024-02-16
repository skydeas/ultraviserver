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
 * Route to create an airline on the database
 */
router.post("/createClient", auth.authenticateRequest(30),  multer().none(), async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.addClientQuery, 
        [
            req.body.formShortName,
            req.body.formLegalName,
            req.body.formType,
            req.body.formAddress,
            req.body.formCity,
            req.body.formState,
            req.body.formZip,
            req.body.formCountry,
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
 * Route to update an airline on the database
 */
router.post("/updateClient/:id", auth.authenticateRequest(30), multer().none(), async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.updateClientQuery, 
            // SET shortName=?,legalName=?,type=?,address=?,city=?,state=?,zip=?,country=? WHERE id=?
        [ 
            req.body.formShortName,
            req.body.formLegalName,
            req.body.formType,
            req.body.formAddress,
            req.body.formCity,
            req.body.formState,
            req.body.formZip,
            req.body.formCountry,
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
router.get("/getClients", auth.authenticateRequest(29),  async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.selectAllClientsQuery  + ' ORDER BY shortName;', (err, response) => {
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
router.get("/getClient/:id", auth.authenticateRequest(29),  async (req, res) => {
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
router.get("/deleteClient/:id", auth.authenticateRequest(30), async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.deleteClientQuery, [req.params.id], (err, response) => {
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
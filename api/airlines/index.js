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
router.post("/createAirline", auth.authenticateRequest(24),  multer().none(), async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.addAirlineQuery, 
        [
            req.body.name,
            req.body.code
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
router.post("/updateAirline/:id", auth.authenticateRequest(24), multer().none(), async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.updateAirlineQuery, 
            // SET IATA=?,ICAO=?,AirlineName=?,City=?,Country=?,Latitude=?,Longitude=?,Altitude=?,TZ=? WHERE id=?
        [ 
            req.body.formName,
            req.body.formCode,
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
router.get("/getAirlines", auth.authenticateRequest(23),  async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.selectAllAirlinesQuery + ' ORDER BY name;', (err, response) => {
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
router.get("/getAirline/:id", auth.authenticateRequest(23),  async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.selectAllAirlinesQuery + " WHERE id=?", [req.params.id], (err, response) => {
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
router.get("/deleteAirline/:id", auth.authenticateRequest(24), async (req, res) => {
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.deleteAirlineQuery, [req.params.id], (err, response) => {
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
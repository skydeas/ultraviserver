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
let POVCity = 'MIA';
//#endregion

const connectionPool = mysql.connectionPool;

/**
 * Route that retrieves all of delay codes
 */
router.get("/getDelayCodes", auth.authenticateRequest(37), async (req, res) => {
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        let query = `SELECT * FROM ultravi_ulav.delay_codes ORDER BY CAST(code AS UNSIGNED), code;`
        //console.log('Query: ', query);
        connectionPool.query(query, (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                return res.status(500).send({ message: 'Internal Server Error' });
            }

            // console.log(response);

            return res.status(200).send(response);
        }); 
    })
});

/**
 * Route that retrieves all of delay codes
 */
router.post("/saveFlightDelays", auth.authenticateRequest(44), async (req, res) => {
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        // console.log('Queries: ', req.body.queryArray);
        for(let i = 0; i < req.body.queryArray.length;i++){
            connectionPool.query(req.body.queryArray[i], (err, response) => {
                if (err) {
                    console.log("Query Error: ", err);
                    return res.status(500).send({ message: 'Internal Server Error' });
                }

                // Log that a user has created a rule:
                const dataToAppend = { action: 'save flight delay', username: decoded._username, id: decoded._id, timestamp: moment().unix(), readableTimestamp:moment.unix(Date.now() / 1000).format('YYYY-MM-DD HH:mm:ss'), response: response, requestBodyQueryIndex: req.body.queryArray[i]};
                const arrayName = 'flightActivity'; // Name of the array in the JSON file

                logger.writeToLogFile(dataToAppend, arrayName);
                // console.log(response);
            }); 
        }
        res.status(200).send({message: 'success'});
    })
});

/**
 * Route that creates a single delay for a flight leg
 */
router.post("/createFis", auth.authenticateRequest(44), multer().none(), async (req, res) => {
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        connectionPool.query(config.queries.createFis, [
            req.body.facility, // Req
            req.body.airlineId, // Req
            req.body.ac_type !== 'null' ? req.body.ac_type : null,
            req.body.body_type !== 'null' ? req.body.body_type : null,
            req.body.flight_number, // Req
            req.body.scheduled_arrival_time, // Req
            req.body.block_time !== 'null' ? req.body.block_time : null,
            req.body.first_priority !== 'null' ? req.body.first_priority : null,
            req.body.last_priority !== 'null' ? req.body.last_priority : null,
            req.body.first_bag !== 'null' ? req.body.first_bag : null,
            req.body.last_bag !== 'null' ? req.body.last_bag : null,
            req.body.remarks !== 'null' ? req.body.remarks : null,
        ], (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                return res.status(500).send({ message: 'Internal Server Error' });
            }

            // Log that a user has created a rule:
            const dataToAppend = { action: 'create FIS ', username: decoded._username, id: decoded._id, timestamp: moment().unix(), readableTimestamp:moment.unix(Date.now() / 1000).format('YYYY-MM-DD HH:mm:ss'), response: response, delayForm: req.body};
            const arrayName = 'flightActivity'; // Name of the array in the JSON file

            logger.writeToLogFile(dataToAppend, arrayName);

            res.status(200).send({message: 'success', response: response});
        }); 
    })
});

/**
 * Route that updates a single delay for a flight leg by delay id
 */
router.post("/updateDelay", auth.authenticateRequest(44), multer().none(), async (req, res) => {
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.updateDelay, [
            req.body.leg_id,
            req.body.min,
            req.body.code,
            req.body.at_fault,
            req.body.remarks !== 'null' ? req.body.remarks : null,
            req.body.id
        ], (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                return res.status(500).send({ message: 'Internal Server Error' });
            }

            // Log that a user has created a rule:
            const dataToAppend = { action: 'update flight delay', username: decoded._username, id: decoded._id, timestamp: moment().unix(), readableTimestamp:moment.unix(Date.now() / 1000).format('YYYY-MM-DD HH:mm:ss'), response: response, delayForm: req.body};
            const arrayName = 'flightActivity'; // Name of the array in the JSON file

            logger.writeToLogFile(dataToAppend, arrayName);

            res.status(200).send({message: 'success', response: response});
        }); 
    })
});

/**
 * Route that updates a single delay for a flight leg by delay id
 */
router.post("/deleteDelay", auth.authenticateRequest(44), multer().none(),async (req, res) => {
    console.log('Delete delay: ', req.body)
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        connectionPool.query(config.queries.deleteDelay, [
            req.body.delayId,
        ], (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                return res.status(500).send({ message: 'Internal Server Error' });
            }

            // Log that a user has created a rule:
            const dataToAppend = { action: 'update flight delay', username: decoded._username, id: decoded._id, timestamp: moment().unix(), readableTimestamp:moment.unix(Date.now() / 1000).format('YYYY-MM-DD HH:mm:ss'), response: response, delayForm: req.body};
            const arrayName = 'flightActivity'; // Name of the array in the JSON file

            logger.writeToLogFile(dataToAppend, arrayName);

            res.status(200).send({message: 'success', response: response});
        }); 
    })
});

/** selectAllAdditionalServicesWithFilter
 *  Route to get a specific additional service using the flight id of the modal as the identifier.
 */ 
router.post("/getFisListWithFilter", auth.authenticateRequest(43), async (req, res) => {
    // console.log(req.body)

    // d.... is aliases from delay table
    // a.... is aliases from activity table

    // FROM
    // ultravi_ulav.flight_schedule_delays d is where we define d as the alias for delay table

    // JOIN
    // ultravi_ulav.flight_schedule_activity a ON d.leg_id = a.id define our activity table 

    // SET FILTERS

    // WHERE ---->
    let query = `
      SELECT
        f.id AS fis_id,
        f.facility AS facility,
        f.airlineId AS airlineId,
        f.ac_type AS ac_type,
        f.body_type AS body_type,
        f.flight_number AS flight_number,
        f.scheduled_arrival_time AS scheduled_arrival_time,
        f.block_time AS block_time,
        f.first_priority AS first_priority,
        f.last_priority AS last_priority,
        f.first_bag AS first_bag,
        f.last_bag AS last_bag,
        f.remarks AS remarks
      FROM
        ultravi_ulav.fis f
      WHERE
        (
          ( f.scheduled_arrival_time BETWEEN ${req.body.selectedStartDate} AND ${req.body.selectedEndDate})
        )
        ${req.body.airlineSearchQuery !== "-1" ? ` AND f.airlineId = ${parseInt(req.body.airlineSearchQuery, 10)}` : ""}
        ${req.body.clientSearchQuery !== "-1" ? ` AND f.clientId = ${parseInt(req.body.clientSearchQuery, 10)}` : ""};
    `;
  
    connectionPool.query(query, (err, response) => {
      if (err) {
        console.log("Query Error: ", err);
        return res.status(500).send({ message: 'Internal Server Error' });
      }
      // console.log(response);
      return res.status(200).send(response);
    });
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
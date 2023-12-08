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
 * Route that retrieves all of the legs on a given date from flightBuffer table
 * auth request 22 is view flight activity.
 * @param from the timestamp that we will use as the lower bound of our query for dates. From < date we want < Until
 * @param until the timestamp that we will use as the upper bound of our query for dates. From < date we want < Until
 */
router.get("/getFlightDelays/:id", auth.authenticateRequest(37), async (req, res) => {
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to

    // console.log(req.params.id);

    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        let query = `SELECT * FROM ultravi_ulav.flight_schedule_delays WHERE leg_id = ${req.params.id};`
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
router.post("/saveFlightDelays", auth.authenticateRequest(38), async (req, res) => {
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
router.post("/createDelay", auth.authenticateRequest(38), multer().none(), async (req, res) => {
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        connectionPool.query(config.queries.createDelay, [
            req.body.leg_id,
            req.body.min,
            req.body.code,
            req.body.at_fault,
            req.body.remarks !== 'null' ? req.body.remarks : null,
        ], (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                return res.status(500).send({ message: 'Internal Server Error' });
            }

            // Log that a user has created a rule:
            const dataToAppend = { action: 'create flight delay', username: decoded._username, id: decoded._id, timestamp: moment().unix(), readableTimestamp:moment.unix(Date.now() / 1000).format('YYYY-MM-DD HH:mm:ss'), response: response, delayForm: req.body};
            const arrayName = 'flightActivity'; // Name of the array in the JSON file

            logger.writeToLogFile(dataToAppend, arrayName);

            res.status(200).send({message: 'success', response: response});
        }); 
    })
});

/**
 * Route that updates a single delay for a flight leg by delay id
 */
router.post("/updateDelay", auth.authenticateRequest(38), multer().none(), async (req, res) => {
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
router.post("/deleteDelay", auth.authenticateRequest(38), multer().none(),async (req, res) => {
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
router.post("/getDelaysWithFilter", auth.authenticateRequest(37), async (req, res) => {
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
        d.id AS delay_id,
        d.leg_id,
        d.min AS min,
        d.code AS code,
        d.at_fault AS at_fault,
        d.remarks AS remarks,
        a.airline as airlineId,
        a.client as clientId,
        a.date,
        a.flight_number
      FROM
        ultravi_ulav.flight_schedule_delays d
      JOIN
        ultravi_ulav.flight_schedule_activity a ON d.leg_id = a.id
      WHERE
        (
          (a.arrival_city = '${POVCity}' AND (a.scheduled_arrival_time BETWEEN ${req.body.selectedStartDate} AND ${req.body.selectedEndDate}))
          OR
          (a.departure_city = '${POVCity}' AND (a.scheduled_departure_time BETWEEN ${req.body.selectedStartDate} AND ${req.body.selectedEndDate}))
        )
        ${req.body.airlineSearchQuery !== "-1" ? ` AND a.airline = ${parseInt(req.body.airlineSearchQuery, 10)}` : ""}
        ${req.body.clientSearchQuery !== "-1" ? ` AND a.client = ${parseInt(req.body.clientSearchQuery, 10)}` : ""};
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


module.exports = router;
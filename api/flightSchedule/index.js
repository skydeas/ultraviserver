const express = require('express');
const router = express.Router();
const config = require('../../config/development');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const auth = require('../../auth');
const multer = require('multer');
const connectionPool = mysql.connectionPool;
const mailer = require('../mailer');
const moment = require('moment');

// =================== Middlewares ===========================

/**
 * Route that retrieves all of the entries from our rules table.
 * We will do the filtering client-side.
 */
router.get("/getRules", auth.authenticateRequest(20), async (req, res) => {
   
    // Save token to database:
    connectionPool.query(config.queries.selectAllFlightScheduleRulesQuery, (err, ruleList) => {
        if (err) {
            console.log("Query Error: ", err);
            return res.status(500).send({ message: 'Internal Server Error' });
        }
        
        return res.status(200).send(ruleList);
    });
});

/**
 * Route that retrieves all of the entries from our rules table.
 * We will do the filtering client-side.
 */
router.post("/createRule", auth.authenticateRequest(20), multer().none(), async (req, res) => {
    //console.log(req.body);
   
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        connectionPool.query(config.queries.createFlightScheduleRuleQuery, 
        [
            boolToNumber(req.body.formRecurring),
            req.body.formDate_start,
            req.body.formDate_end,
            req.body.formAirline,
            req.body.formClient,
            req.body.formRemarks,
            req.body.formFlight_number,
            0, // Flight # out, not used, will delete
            req.body.formScheduled_arrival_time,
            req.body.formScheduled_departure_time,
            req.body.formArrival_city,
            req.body.formDeparture_city,
            boolToNumber(req.body.formMonday),
            boolToNumber(req.body.formTuesday),
            boolToNumber(req.body.formWednesday),
            boolToNumber(req.body.formThursday),
            boolToNumber(req.body.formFriday),
            boolToNumber(req.body.formSaturday),
            boolToNumber(req.body.formSunday),
            req.body.form_ac_type,
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
 * Route that retrieves all of the legs on a given date from flightActivity table
 * auth request 22 is view flight activity.
 * @param from the timestamp that we will use as the lower bound of our query for dates. From < date we want < Until
 * @param until the timestamp that we will use as the upper bound of our query for dates. From < date we want < Until
 */
router.post("/getFlightActivity", auth.authenticateRequest(22), async (req, res) => {
    console.log('Request.body: ', JSON.stringify(req.body));
    res.status(200).send({'message': 'activity'});
});

/**
 * Route that retrieves all of the legs on a given date from flightBuffer table
 * auth request 22 is view flight activity.
 * @param from the timestamp that we will use as the lower bound of our query for dates. From < date we want < Until
 * @param until the timestamp that we will use as the upper bound of our query for dates. From < date we want < Until
 */
router.post("/getFlightBuffer", auth.authenticateRequest(22), async (req, res) => {
    console.log('Request.body: ', JSON.stringify(req.body));
    res.status(200).send({'message': 'buffer'});
});

/**
 * Route that retrieves all of the legs on a given date from flightRules table
 * auth request 22 is view flight activity.
 * @param from the timestamp that we will use as the lower bound of our query for dates. From < date we want < Until
 * @param until the timestamp that we will use as the upper bound of our query for dates. From < date we want < Until
 */
router.post("/getFlightRules", auth.authenticateRequest(22), async (req, res) => {
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        // =============== For DayOfWeek ====================

        // Get mid day of requested day. This will be to get the day of the week of the requested Date (On Local time for the server, which should match station Locale)
        let middleOfDay = (req.body.from + req.body.until)/2;
        // Create a moment object from the timestamp (converted into milliseconds)
        const date = moment(middleOfDay * 1000);
        // Get the day of the week
        let dayOfWeek = date.format('dddd');
        // =============== For utcOffset ====================
        let offsetMinutes = moment().utcOffset();


        // let query = `SELECT * FROM ultravi_ulav.flight_schedule_rules WHERE ${middleOfDay} BETWEEN date_start AND date_end AND ${dayOfWeek} = true AND (arrival_city = 'MIA' OR departure_city = 'MIA');`
        let query = `SELECT * FROM ultravi_ulav.flight_schedule_rules WHERE (arrival_city = 'MIA'  AND (${req.body.from} + (HOUR(scheduled_arrival_time)* 3600) + (MINUTE(scheduled_arrival_time) * 60) + (${offsetMinutes} * 60) BETWEEN date_start AND date_end) AND ${dayOfWeek} = true) OR (departure_city = 'MIA'  AND (${req.body.from} + (HOUR(scheduled_departure_time)* 3600) + (MINUTE(scheduled_departure_time) * 60) + (${offsetMinutes} * 60) BETWEEN date_start AND date_end) AND ${dayOfWeek} = true);`
        console.log('Query: ', query);
        connectionPool.query(query, (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                return res.status(500).send({ message: 'Internal Server Error' });
            }

            console.log(response);
            return res.status(200).send(response);
        }); 
    });
});

function getUtcOffsetInHours() {
    let utcOffset = (Math.abs(moment().utcOffset()) / 60);
    return utcOffset;
  }

function boolToNumber(boolString) {
    tempBool = JSON.parse(boolString);
    if(tempBool){
        return 1;
    } else {
        return 0;
    }
}

module.exports = router;
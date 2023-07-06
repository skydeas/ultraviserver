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

let POVCity = 'MIA';

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
            req.body.form_sta_offset,
            // req.body.form_std_offset, DEPRECATED
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
    //console.log('Request.body: ', JSON.stringify(req.body));
    //res.status(200).send({'message': 'activity'});
    let bufferArray = [];
    let activityArray = [];

    // Get activity, then Get buffer, append, return to filter.
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        let query = `SELECT * FROM ultravi_ulav.flight_schedule_buffer WHERE (arrival_city = '${POVCity}'  AND (scheduled_arrival_time BETWEEN ${req.body.from} AND ${req.body.until})) OR (departure_city = '${POVCity}'  AND (scheduled_departure_time BETWEEN ${req.body.from} AND ${req.body.until}));`
        // console.log('Query: ', query);
        connectionPool.query(query, (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                return res.status(500).send({ message: 'Internal Server Error' });
            }

            //console.log(response);

            bufferArray = response.map((obj) => {
                return {...obj, origin: 'buffer'};
            });

            let queryActivity = `SELECT * FROM ultravi_ulav.flight_schedule_activity WHERE (arrival_city = '${POVCity}'  AND (scheduled_arrival_time BETWEEN ${req.body.from} AND ${req.body.until})) OR (departure_city = '${POVCity}'  AND (scheduled_departure_time BETWEEN ${req.body.from} AND ${req.body.until}));`
            // console.log('Query: ', query);
            connectionPool.query(queryActivity, (err, response) => {
                if (err) {
                    console.log("Query Error: ", err);
                    return res.status(500).send({ message: 'Internal Server Error' });
                }
    
                // console.log(response);
                activityArray = response.map((obj) => {
                return {...obj, origin: 'activity'};
            });

                //console.log('async')
                return res.status(200).send(activityArray.concat(bufferArray));
            }); 
        }); 
    })
});

/**
 * Route that retrieves all of the legs on a given date from flightBuffer table
 * auth request 22 is view flight activity.
 * @param from the timestamp that we will use as the lower bound of our query for dates. From < date we want < Until
 * @param until the timestamp that we will use as the upper bound of our query for dates. From < date we want < Until
 */
router.post("/getFlightBuffer", auth.authenticateRequest(22), async (req, res) => {
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        // =============== For utcOffset ====================
        let offsetMinutes = moment().utcOffset();

        let query = `SELECT * FROM ultravi_ulav.flight_schedule_buffer WHERE (arrival_city = '${POVCity}'  AND (scheduled_arrival_time BETWEEN ${req.body.from} AND ${req.body.until})) OR (departure_city = '${POVCity}'  AND (scheduled_departure_time BETWEEN ${req.body.from} AND ${req.body.until}));`
        //console.log('Query: ', query);
        connectionPool.query(query, (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                return res.status(500).send({ message: 'Internal Server Error' });
            }

            // console.log(response);

            let bufferArray = response.map((obj) => {
                return {...obj, origin: 'buffer'};
            });

            return res.status(200).send(bufferArray);
        }); 
    })
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
        // ================ Variables for virtual buffer ====================
        let dayOfWeekMinusOne = date.clone().subtract(1, 'day').format('dddd');
        let dayOfWeekPlusOne = date.clone().add(1, 'day').format('dddd');
        // ================ UTC Converted Dates ============================
        let fromUtc = moment(req.body.from * 1000).utc().startOf('day').unix(); 
        let fromUtcMinusOne = fromUtc - 86400; 
        let fromUtcPlusOne = fromUtc + 86400; 

        console.log("Today: ", dayOfWeek, " dayOfWeekMinusOne: ", dayOfWeekMinusOne, " dayOfWeekPlusOne: ", dayOfWeekPlusOne);
        // =============== For utcOffset ====================
        let offsetMinutes = moment().utcOffset();

        let query = 
        `
        SELECT 
            * 
        FROM 
            (
            SELECT 
                queryDateInside.generated_id, 
                queryDateInside.date_start,
                queryDateInside.date, 
                queryDateInside.airline, 
                queryDateInside.client, 
                queryDateInside.remarks, 
                queryDateInside.flight_number, 
                queryDateInside.scheduled_arrival_time, 
                queryDateInside.scheduled_departure_time, 
                queryDateInside.arrival_city, 
                queryDateInside.departure_city, 
                queryDateInside.next_leg_pointer, 
                queryDateInside.ac_type,
                DATEDIFF(FROM_UNIXTIME(${fromUtc}), FROM_UNIXTIME(queryDateInside.date_start)) AS nth_flight_number
            FROM 
                (
                SELECT 
                    id, 
                    date_start,
                    CONCAT
                        (
                            id,
                            '-', 
                            (DATEDIFF(FROM_UNIXTIME(${fromUtc}), FROM_UNIXTIME(date_start)))
                        ) as generated_id, 
                    ${fromUtc} as date, 
                    airline, 
                    client, 
                    remarks, 
                    flight_number, 
                    (
                    ${fromUtc} + (
                        HOUR(scheduled_departure_time) * 3600
                    ) + (
                        MINUTE(scheduled_departure_time) * 60
                    )
                    ) as scheduled_departure_time, 
                    (
                    ${fromUtc} + (
                        HOUR(scheduled_arrival_time) * 3600
                    ) + (
                        MINUTE(scheduled_arrival_time) * 60
                    ) + (sta_offset * 86400)
                    ) as scheduled_arrival_time, 
                    arrival_city, 
                    departure_city, 
                    ac_type, 
                    IF(
                    next_leg_pointer IS NOT NULL, 
                    CONCAT(
                        inner_queryDate.next_leg_pointer, 
                        '-',
                        (
                        SELECT 
                            (DATEDIFF(FROM_UNIXTIME(${fromUtc}), FROM_UNIXTIME(t.date_start)))  + (DATEDIFF(FROM_UNIXTIME(t.date_start), FROM_UNIXTIME(inner_queryDate.date_start)))
                        FROM 
                            ultravi_ulav.flight_schedule_rules t 
                        WHERE 
                            t.id = inner_queryDate.next_leg_pointer
                        )
                    ), 
                    NULL
                    ) AS next_leg_pointer 
                FROM 
                    (
                    SELECT 
                        * 
                    FROM 
                        ultravi_ulav.flight_schedule_rules 
                    WHERE 
                        (
                        ${fromUtc} + (
                            HOUR(scheduled_departure_time) * 3600
                        ) + (
                            MINUTE(scheduled_departure_time) * 60
                        ) BETWEEN date_start 
                        AND date_end
                        ) 
                        AND ${dayOfWeek} = true
                    ) as inner_queryDate
                ) as queryDateInside 
            UNION 
                (
                SELECT 
                    queryDateInsideMinusOne.generated_id, 
                    queryDateInsideMinusOne.date_start,
                    queryDateInsideMinusOne.date, 
                    queryDateInsideMinusOne.airline, 
                    queryDateInsideMinusOne.client, 
                    queryDateInsideMinusOne.remarks, 
                    queryDateInsideMinusOne.flight_number, 
                    queryDateInsideMinusOne.scheduled_arrival_time, 
                    queryDateInsideMinusOne.scheduled_departure_time, 
                    queryDateInsideMinusOne.arrival_city, 
                    queryDateInsideMinusOne.departure_city, 
                    queryDateInsideMinusOne.next_leg_pointer, 
                    queryDateInsideMinusOne.ac_type,
                    DATEDIFF(FROM_UNIXTIME(${fromUtcMinusOne}), FROM_UNIXTIME(queryDateInsideMinusOne.date_start)) AS nth_flight_number
                FROM 
                    (
                    SELECT 
                        id, 
                        date_start,
                        CONCAT
                        (
                            id,
                            '-', 
                            (DATEDIFF(FROM_UNIXTIME(${fromUtcMinusOne}), FROM_UNIXTIME(date_start)))
                        ) as generated_id, 
                        ${fromUtcMinusOne} as date, 
                        airline, 
                        client, 
                        remarks, 
                        flight_number, 
                        (
                        ${fromUtcMinusOne} + (
                            HOUR(scheduled_departure_time) * 3600
                        ) + (
                            MINUTE(scheduled_departure_time) * 60
                        )
                        ) as scheduled_departure_time, 
                        (
                        ${fromUtcMinusOne} + (
                            HOUR(scheduled_arrival_time) * 3600
                        ) + (
                            MINUTE(scheduled_arrival_time) * 60
                        ) + (sta_offset * 86400)
                        ) as scheduled_arrival_time, 
                        arrival_city, 
                        departure_city, 
                        ac_type, 
                        IF(
                            next_leg_pointer IS NOT NULL, 
                            CONCAT(
                                inner_queryDateMinusOne.next_leg_pointer, 
                                '-',
                                (
                                SELECT 
                                    (DATEDIFF(FROM_UNIXTIME(${fromUtcMinusOne}), FROM_UNIXTIME(t.date_start)))  + (DATEDIFF(FROM_UNIXTIME(t.date_start), FROM_UNIXTIME(inner_queryDateMinusOne.date_start)))
                                FROM 
                                    ultravi_ulav.flight_schedule_rules t 
                                WHERE 
                                    t.id = inner_queryDateMinusOne.next_leg_pointer
                                )
                            ), 
                            NULL
                        ) AS next_leg_pointer
                    FROM 
                        (
                        SELECT 
                            * 
                        FROM 
                            ultravi_ulav.flight_schedule_rules 
                        WHERE 
                            (
                            ${fromUtcMinusOne} + (
                                HOUR(scheduled_departure_time) * 3600
                            ) + (
                                MINUTE(scheduled_departure_time) * 60
                            ) BETWEEN date_start 
                            AND date_end
                            ) 
                            AND ${dayOfWeekMinusOne} = true
                        ) as inner_queryDateMinusOne
                    ) as queryDateInsideMinusOne
                ) 
            UNION 
                (
                SELECT 
                    queryDateInsidePlusOne.generated_id, 
                    queryDateInsidePlusOne.date_start,
                    queryDateInsidePlusOne.date, 
                    queryDateInsidePlusOne.airline, 
                    queryDateInsidePlusOne.client, 
                    queryDateInsidePlusOne.remarks, 
                    queryDateInsidePlusOne.flight_number, 
                    queryDateInsidePlusOne.scheduled_arrival_time, 
                    queryDateInsidePlusOne.scheduled_departure_time, 
                    queryDateInsidePlusOne.arrival_city, 
                    queryDateInsidePlusOne.departure_city, 
                    queryDateInsidePlusOne.next_leg_pointer, 
                    queryDateInsidePlusOne.ac_type,
                    DATEDIFF(FROM_UNIXTIME(${fromUtcPlusOne}), FROM_UNIXTIME(queryDateInsidePlusOne.date_start)) AS nth_flight_number
                FROM 
                    (
                    SELECT 
                        id, 
                        date_start,
                        CONCAT
                        (
                            id,
                            '-', 
                            (DATEDIFF(FROM_UNIXTIME(${fromUtcPlusOne}), FROM_UNIXTIME(date_start)))
                        ) as generated_id, 
                        ${fromUtcPlusOne} as date, 
                        airline, 
                        client, 
                        remarks, 
                        flight_number, 
                        (
                        ${fromUtcPlusOne} + (
                            HOUR(scheduled_departure_time) * 3600
                        ) + (
                            MINUTE(scheduled_departure_time) * 60
                        )
                        ) as scheduled_departure_time, 
                        (
                        ${fromUtcPlusOne} + (
                            HOUR(scheduled_arrival_time) * 3600
                        ) + (
                            MINUTE(scheduled_arrival_time) * 60
                        ) + (sta_offset * 86400)
                        ) as scheduled_arrival_time, 
                        arrival_city, 
                        departure_city, 
                        ac_type, 
                        IF(
                            next_leg_pointer IS NOT NULL, 
                            CONCAT(
                                inner_queryDatePlusOne.next_leg_pointer, 
                                '-',
                                (
                                SELECT 
                                    (DATEDIFF(FROM_UNIXTIME(${fromUtcPlusOne}), FROM_UNIXTIME(t.date_start))) + (DATEDIFF(FROM_UNIXTIME(t.date_start), FROM_UNIXTIME(inner_queryDatePlusOne.date_start)))
                                FROM 
                                    ultravi_ulav.flight_schedule_rules t 
                                WHERE 
                                    t.id = inner_queryDatePlusOne.next_leg_pointer
                                )
                            ), 
                            NULL
                        ) AS next_leg_pointer
                    FROM 
                        (
                        SELECT 
                            * 
                        FROM 
                            ultravi_ulav.flight_schedule_rules 
                        WHERE 
                            (
                            ${fromUtcPlusOne} + (
                                HOUR(scheduled_departure_time) * 3600
                            ) + (
                                MINUTE(scheduled_departure_time) * 60
                            ) BETWEEN date_start 
                            AND date_end
                            ) 
                            AND ${dayOfWeekPlusOne} = true
                        ) as inner_queryDatePlusOne
                    ) as queryDateInsidePlusOne
                )
            ) as resultQuery
        WHERE 
            (
            arrival_city = '${POVCity}' 
            AND (
                scheduled_arrival_time BETWEEN ${req.body.from} 
                AND ${req.body.until}
            )
            ) 
            OR (
            departure_city = '${POVCity}' 
            AND (
                scheduled_departure_time BETWEEN ${req.body.from} 
                AND ${req.body.until}
            )
        );
        `

        //let query = `SELECT * FROM ultravi_ulav.flight_schedule_rules WHERE (arrival_city = '${POVCity}'  AND (${req.body.from} + (HOUR(scheduled_arrival_time)* 3600) + (MINUTE(scheduled_arrival_time) * 60) + (${offsetMinutes} * 60) BETWEEN date_start AND date_end) AND ${dayOfWeek} = true) OR (departure_city = '${POVCity}'  AND (${req.body.from} + (HOUR(scheduled_departure_time)* 3600) + (MINUTE(scheduled_departure_time) * 60) + (${offsetMinutes} * 60) BETWEEN date_start AND date_end) AND ${dayOfWeek} = true);`
        // console.log('Query: ', query);
        connectionPool.query(query, (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                return res.status(500).send({ message: 'Internal Server Error' });
            }

             // console.log(response);

            let rulesArray = response.map((obj) => {
                return {...obj, origin: 'rules'};
            });

            return res.status(200).send(rulesArray);
        }); 
    });
});

/**
 * Route that retrieves all of the legs on a given date from flightBuffer table
 * auth request 22 is view flight activity.
 * @param from the timestamp that we will use as the lower bound of our query for dates. From < date we want < Until
 * @param until the timestamp that we will use as the upper bound of our query for dates. From < date we want < Until
 */
router.get("/getFlightDelays/:id", auth.authenticateRequest(22), async (req, res) => {
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to

    console.log(req.params.id);

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
router.get("/getDelayCodes", auth.authenticateRequest(22), async (req, res) => {
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        let query = `SELECT * FROM ultravi_ulav.delay_codes`
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
router.post("/saveFlightDelays", auth.authenticateRequest(22), async (req, res) => {
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
                // console.log(response);
            }); 
        }
        res.status(200).send({'test':'a'});
    })
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
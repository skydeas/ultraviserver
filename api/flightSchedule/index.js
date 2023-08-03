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
            parseInt(req.body.formAirline, 10),
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
            parseInt(req.body.form_ac_type, 10),
            req.body.form_sta_offset,
            // req.body.form_std_offset, DEPRECATED
        ], async (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                // responseSent = true;
                return res.status(500).send({ message: 'Internal Server Error' });
            }


            // Add flights to buffer (if necessary.)
            await fillBufferOnRuleCreation(req.body, response.insertId);

            // console.log(response);
            return res.status(200).send(response);
        });  
    })
});

/**
 * Function that creates the legs in the buffer that fit within the contract being created.
 *  Buffer is 14 days from now, today is 0 days from now.
 *  If we need to create Today, + a full buffer, that is a total of 15 days worth of legs.
 */
async function fillBufferOnRuleCreation(ruleForm, insertId){
    const secondsPerDay = 86400;
    let today = moment.utc().startOf('day').unix(); //Date is start of day in UTC (00:00:00)
    let startOfRule = ruleForm.formDate_start;
    let endOfRule = ruleForm.formDate_end;
    let firstDayOfBuffer = moment.utc().startOf('day').unix() + (1 * secondsPerDay) //Date is start of day in UTC (00:00:00)
    let lastDayOfBuffer = moment.utc().startOf('day').unix() + (14 * secondsPerDay) //Date is start of day in UTC (00:00:00)

    
    console.log('today ', today)
    console.log('startOfRule ', startOfRule)
    console.log('endOfRule ', endOfRule)
    console.log('firstDayOfBuffer ', firstDayOfBuffer)
    console.log('lastDayOfBuffer ', lastDayOfBuffer)


    // This for loop is for today, and the length of the  buffer!
    for(let i = 0; i < 15; i++){
        let dayOfForLoop = today + (i * secondsPerDay); // Today + 14
        let databaseName = '';
        const localTimezoneOffset = Math.abs((moment().utcOffset() / 60)); // It comes out to -4 originally, so i took the math.abs of the number
        const dayOfWeek = moment((dayOfForLoop + ((secondsPerDay / 24) * localTimezoneOffset ))* 1000).format('dddd').toLowerCase(); // Add 4 hours to timezone

        console.log('today: ', today);
        console.log('dayOfForLoop: ', dayOfForLoop);
        console.log('dayOfWeek: ', dayOfWeek);

        if(dayOfForLoop == today){
            console.log('activity')
            databaseName = 'ultravi_ulav.flight_schedule_activity';
        } else if(dayOfForLoop >= startOfRule && dayOfForLoop <= lastDayOfBuffer ){
            console.log('buffer')
            databaseName = 'ultravi_ulav.flight_schedule_buffer';
        } else {
            console.log('NOT in the buffer or activity')
            return;
        }

        let generateAndInsertLegsQuery = 
            `
            INSERT INTO ${databaseName}(
            generated_id, date, airline, client, 
            remarks, flight_number, scheduled_arrival_time, 
            scheduled_departure_time, arrival_city, 
            departure_city, next_leg_pointer, 
            ac_type)
                (
                SELECT 
                    queryDateInside.generated_id, 
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
                    queryDateInside.ac_type
                    
                FROM 
                    (
                    SELECT 
                        id, 
                        date_start,
                        CONCAT
                            (
                                id,
                                '-', 
                                (DATEDIFF(FROM_UNIXTIME(${dayOfForLoop}), FROM_UNIXTIME(date_start)))
                            ) as generated_id, 
                        ${dayOfForLoop} as date, 
                        airline, 
                        client, 
                        remarks, 
                        flight_number, 
                        (
                        ${dayOfForLoop} + (
                            HOUR(scheduled_departure_time) * 3600
                        ) + (
                            MINUTE(scheduled_departure_time) * 60
                        )
                        ) as scheduled_departure_time, 
                        (
                        ${dayOfForLoop} + (
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
                                (DATEDIFF(FROM_UNIXTIME(${dayOfForLoop}), FROM_UNIXTIME(t.date_start)))  + (DATEDIFF(FROM_UNIXTIME(t.date_start), FROM_UNIXTIME(inner_queryDate.date_start)))
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
                            ${dayOfForLoop} + (
                                HOUR(scheduled_departure_time) * 3600
                            ) + (
                                MINUTE(scheduled_departure_time) * 60
                            ) BETWEEN date_start 
                            AND date_end
                            ) 
                            AND ${dayOfWeek} = true
                            AND id = ${insertId}
                        ) as inner_queryDate
                    ) as queryDateInside 
                )
                `
            // console.log('query: ', generateAndInsertLegsQuery);
            // Insert new rules onto buffer in a single query.
            connectionPool.query(generateAndInsertLegsQuery, (err, response) => {
                if (err) {
                    console.log("Query Error: ", err);
                    throw err
                }
        
                console.log(response)
            });
    }
    //return res.status(200).send({'message': 'Added Rules to Buffer!'});
}

function calculateSeconds(timeString){
    const [hours, minutes] = timeString.split(':').map(Number);
    const seconds = (hours * 3600) + (minutes * 60);
    return seconds;
}


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
        res.status(200).send({message: 'success'});
    })
});

/**
 * Route that updates a specifci leg from either flight activity or buffer
 * TASK NOT DEFINED. PLEASE CONSULT AND FIX
 */
router.post("/updateFlightLeg", multer().none(), async (req, res) => { // , auth.authenticateRequest(22)
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        let startOfDayArrival = moment.unix(req.body.stashed_STA).utc().startOf('day');
        let startOfDayDeparture = moment.unix(req.body.stashed_STD).utc().startOf('day');
        console.log(startOfDayArrival);
        console.log(startOfDayDeparture);


        let databaseName = '';
        console.log(req.body);
        if(req.body.origin == 'activity'){
            databaseName = 'ultravi_ulav.flight_schedule_activity';
        } else if(req.body.origin == 'buffer'){
            databaseName = 'ultravi_ulav.flight_schedule_buffer';
        }

        connectionPool.query(
            `UPDATE ${databaseName} SET 
                ac_type=${parseInt(req.body.ac_type, 10)}, 
                actual_arrival_time=${req.body.actual_arrival_time === '' ? 'NULL' : startOfDayArrival.unix() + moment.duration(req.body.actual_arrival_time).asSeconds()},
                actual_departure_time=${req.body.actual_departure_time === '' ? 'NULL' : startOfDayDeparture.unix() + moment.duration(req.body.actual_departure_time).asSeconds()}, 
                ac_reg=${req.body.ac_reg !== 'null' ? `'${req.body.ac_reg}'` : 'NULL'}, 
                airline=${parseInt(req.body.airline, 10)}, 
                arrival_city='${req.body.arrival_city}', 
                client='${req.body.client}', 
                date=${req.body.date}, 
                departure_city='${req.body.departure_city}', 
                estimated_arrival_time=${req.body.estimated_arrival_time === '' ? 'NULL' : startOfDayArrival.unix() + moment.duration(req.body.estimated_arrival_time).asSeconds()}, 
                estimated_departure_time=${req.body.estimated_departure_time === '' ? 'NULL' :startOfDayDeparture.unix() + moment.duration(req.body.estimated_departure_time).asSeconds()}, 
                flight_number=${req.body.flight_number}, 
                gate=${req.body.gate !== 'null' ? `'${req.body.gate}'` : 'NULL'}, 
                next_leg_pointer=${req.body.next_leg_pointer !== 'null' ? `'${req.body.next_leg_pointer}'` : 'NULL'}, 
                pax=${req.body.pax}, 
                remarks='${req.body.remarks}', 
                scheduled_arrival_time=${req.body.stashed_STA}, 
                scheduled_departure_time=${req.body.stashed_STD}, 
                wheelchair_count=${req.body.wheelchair_count !== 'null' && req.body.wheelchair_count !== '' ? `'${req.body.wheelchair_count}'` : 'NULL'},
                isSubservice=${req.body.isSubservice},
                flightStatus=${req.body.flightStatus}
            WHERE id=${req.body.id}`, 
        (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                return res.status(500).send({ message: 'Internal Server Error' });
            }

            // console.log(response);

            return res.status(200).send(response);
        }); 
       //return res.status(200).send(req.body);
    })
});

/**
 * Route that creates a leg on the flight activity 
 * TASK NOT DEFINED. PLEASE CONSULT AND FIX
 */
router.post("/createFlightLeg", multer().none(), async (req, res) => { // , auth.authenticateRequest(22)
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        
        let startOfDayArrival = moment.unix(req.body.date).utc().startOf('day');
        let startOfDayDeparture = moment.unix(req.body.date).utc().startOf('day');
        console.log(startOfDayArrival);
        console.log(startOfDayDeparture);
        

        let databaseName = '';
        let tablename = '';
        console.log(req.body);
        if(req.body.origin == 'activity'){
            databaseName = 'ultravi_ulav.flight_schedule_activity';
            tablename = 'flight_schedule_activity';
        } else if(req.body.origin == 'buffer'){
            databaseName = 'ultravi_ulav.flight_schedule_buffer';
            tablename = 'flight_schedule_buffer';
        }
        let query = `
        INSERT INTO ${databaseName}
        (ac_type, actual_arrival_time, actual_departure_time, ac_reg, airline, arrival_city, client, date, departure_city, estimated_arrival_time, estimated_departure_time, flight_number, gate, next_leg_pointer, pax, remarks, scheduled_arrival_time, scheduled_departure_time, wheelchair_count, isSubservice, flightStatus, generated_id)
        SELECT
            ${parseInt(req.body.ac_type, 10)}, 
            ${req.body.actual_arrival_time === '' ? 'NULL' : startOfDayArrival.unix() + moment.duration(req.body.actual_arrival_time).asSeconds()},
            ${req.body.actual_departure_time === '' ? 'NULL' : startOfDayDeparture.unix() + moment.duration(req.body.actual_departure_time).asSeconds()}, 
            ${req.body.ac_reg !== 'null' && req.body.ac_reg !== '' ? `'${req.body.ac_reg}'` : 'NULL'},
            ${parseInt(req.body.airline, 10)}, 
            '${req.body.arrival_city}', 
            '${req.body.client}', 
            ${req.body.date}, 
            '${req.body.departure_city}', 
            ${req.body.estimated_arrival_time === '' ? 'NULL' : startOfDayArrival.unix() + moment.duration(req.body.estimated_arrival_time).asSeconds()}, 
            ${req.body.estimated_departure_time === '' ? 'NULL' :startOfDayDeparture.unix() + moment.duration(req.body.estimated_departure_time).asSeconds()}, 
            ${req.body.flight_number}, 
            ${req.body.gate !== 'null' ? `'${req.body.gate}'` : 'NULL'}, 
            ${req.body.next_leg_pointer !== 'null' ? `'${req.body.next_leg_pointer}'` : 'NULL'}, 
            ${req.body.pax !== 'null' && req.body.pax !== '' ? `'${req.body.pax}'` : 'NULL'},
            '${req.body.remarks}', 
            ${req.body.scheduled_arrival_time === '' ? 'NULL' : startOfDayArrival.unix() + moment.duration(req.body.scheduled_arrival_time).asSeconds()}, 
            ${req.body.scheduled_departure_time === '' ? 'NULL' : startOfDayArrival.unix() + moment.duration(req.body.scheduled_departure_time).asSeconds()},
            ${req.body.wheelchair_count !== 'null' && req.body.wheelchair_count !== '' ? `'${req.body.wheelchair_count}'` : 'NULL'},
            ${req.body.isSubservice},
            ${req.body.flightStatus},
            CONCAT('ADHC-', (@autoincrement := AUTO_INCREMENT) + 1)
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = "ultravi_ulav"
        AND TABLE_NAME = "${tablename}";
    `;

        console.log(query);
                
        connectionPool.query(
            query, 
        (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                return res.status(500).send({ message: 'Internal Server Error' });
            }

            console.log(response);

            return res.status(200).send(response);
        }); 
       //return res.status(200).send(req.body);
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
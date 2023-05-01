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

function replaceSpecialCharacters(str) {
    const regex = /['"\\\0\\\r\\\n\\\t\\\v\\\b\\\f&<>%*;[\]{}!:#^$~|\/?]/g;
    return str.replace(regex, "");
}

// Middleware function to ensure filename does not contain spaces nor any '.pdf'
const sanitizeData = function (req, res, next) {
    // Remove any instance of .pdf from filename
    let newFilename = req.body.formFilename;
    newFilename = newFilename.replace(/\.pdf/g, ''); // remove any instance of '.pdf' from the filename
    req.body.formFilename = newFilename;

    req.body.formDocname = replaceSpecialCharacters(req.body.formDocname);
    req.body.formFilenameSanitized = replaceSpecialCharacters(req.body.formFilename);
    req.body.formTitle = replaceSpecialCharacters(req.body.formTitle);
    req.body.formVersion = replaceSpecialCharacters(req.body.formVersion);

    next();
}

// Middleware function to save the actual entry on our document database
const saveToDatabase = function(req, res, next) {
    console.log('saveToDatabase: ', req.body);
    // Set our default value for ver field
    if(req.body.formVersion == '') req.body.formVersion = 'None';

    connectionPool.query(config.queries.addDocumentQuery,
        [
            0, // Seq
            req.body.formDocname,
            req.body.formFilenameSanitized +  '.pdf',
            req.body.formTitle,
            req.body.formVersion,
            1, // active
            req.body.formEffective,
            req.body.formUpdated
        ], (err, response) => {
        if (err) {
            console.log("Query Error: ", err);
            return res.status(500).send({ message: 'Internal Server Error' });
        }
        // console.log("File added successfully");
        next();
    });
}

// Middleware function that ensures that the username and email from the request are:
// - Active,
// - Username and Email match
// This is to reduce spam and ensure reliability of the system.
const isUserValid = function(req, res, next) {
    connectionPool.query('SELECT COUNT(*) AS count FROM users WHERE username = ? AND email = ? AND active = ?;' , [req.body.username, req.body.email, 'Y'], (err, rows) => {
        if (err) {
            console.log("Query Error: ", err);
            return res.status(500).send({ message: 'Internal Server Error' });
        }

        // check if an entry exists
        if (rows[0].count > 0) {
            // an entry exists for the matching set of username and email
            console.log('entry exists for that user AND they are valid');
            next();
        } else {
            // no entry exists
            console.log('reject the operation.')
            return res.status(403).send({ message: 'User could not be validated' });
        }  
    });
}

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
 * Route that retrieves all of the departures on a given date.
 * auth request 22 is view flight activity.
 */
router.get("/getFlightActivityDepartures/:date", auth.authenticateRequest(22), async (req, res) => {
    // console.log('unix timestamp passed as req params date: ',req.params.date);

    // Get day of the week
    const dayOfWeek = moment(req.params.date * 1000).format('dddd').toLowerCase();

    console.log('day of week: ', dayOfWeek);
    
    // We hard coded MIA into the query

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        // Not using the config query
        const query = `SELECT * FROM ultravi_ulav.flight_schedule_rules WHERE ${req.params.date} BETWEEN date_start AND date_end AND ${dayOfWeek} = true AND departure_city = 'MIA'`;

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
 * Route that retrieves all of the departures on a given date.
 * auth request 22 is view flight activity.
 */
router.get("/getFlightActivityArrivals/:date", auth.authenticateRequest(22), async (req, res) => {
    // console.log('unix timestamp passed as req params date: ',req.params.date);

    // Get day of the week
    const dayOfWeek = moment(req.params.date * 1000).format('dddd').toLowerCase();

    console.log('day of week: ', dayOfWeek);
    
    // We hard coded MIA into the query

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        // Not using the config query
        const query = `SELECT * FROM ultravi_ulav.flight_schedule_rules WHERE ${req.params.date} BETWEEN date_start AND date_end AND ${dayOfWeek} = true AND arrival_city = 'MIA'`;

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
 * Route that retrieves all of the departures on a given date.
 * auth request 22 is view flight activity.
 * @param date: the date we are getting is a LOCAL unix timestamp. we must convert it to UTC and then to the startOf('day'); 
 */
router.get("/getFlightActivity/:date", auth.authenticateRequest(22), async (req, res) => {
    // Get day of the week (For the Query)
    console.log('Unedited date: ', req.params.date);
    let localMoment = moment.unix(req.params.date)
    console.log('localMoment: ', localMoment);

    // Get the UTC offset for the local timestamp
    const utcOffsetSeconds = localMoment.utcOffset() * 60;
    console.log('utcOffsetSeconds: ', utcOffsetSeconds);

    // Convert the local timestamp to UTC timestamp by subtracting the UTC offset
    const utcTimestamp = localMoment.unix() - utcOffsetSeconds;

    console.log('utcTimestamp', utcTimestamp); // Output: 


    // Adding 4 hours to the date so we have local date. Yeah these dates are confusing.
    const dayOfWeek = moment.unix(parseInt(req.params.date) + (3600 * 4)).format('dddd').toLowerCase();
    console.log('day of week: ', dayOfWeek);

    // Input needs to be mutliplied by 1000 to be used. We need to 
    // Know what category the request falls into, either: FA, FB, FR
    // past to today -> Flight Activity
    // (today + 1) to (today + 14)  2 week buffer periond -> Flight Buffer
    // (today + 15) and above -> Flight Rules.
    // Assume the Unix timestamp is stored in a variable called `timestamp`.

    const secondsPerDay = 86400;
    const date = moment.unix(req.params.date).startOf('day').unix();
    console.log(date);
    const today = moment().utc().startOf('day').unix();
    console.log(today)
    const timestamp = moment.utc().startOf('day').unix();
    console.log(timestamp); // output: 1672393600
    

    // Calculate the difference between the two dates in days.
    const diffInSeconds = (date - today);
    const diffInDays = Math.floor(diffInSeconds / secondsPerDay);
    console.log(diffInDays);

    switch (true) {
    case diffInDays < 0:
        console.log('Case 1: date is before today.');
        break;
    case diffInDays == 0:
        console.log('Case 2: date is today.');
        break;
    case diffInDays >= 1 && diffInDays <= 14:
        // console.log('Case 2: date is between tomorrow and two weeks from now.');
        
        // Get Flight Buffer Query
        // We hard coded MIA into the query, 
        // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access

        jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
            if (err || decoded == undefined) {
                return res.status(500).send({ message: 'Bad Token' });
                
            }
            // Not using the config query
            const query = `SELECT * FROM ultravi_ulav.flight_schedule_buffer WHERE ${req.params.date} BETWEEN date AND (date + 86399)  AND (arrival_city = 'MIA'  OR departure_city = 'MIA');`
            console.log(query)
            connectionPool.query(query, (err, response) => {
                if (err) {
                    console.log("Query Error: ", err);
                    return res.status(500).send({ message: 'Internal Server Error' });
                }
                console.log(response);
                return res.status(200).send(response);
            });  
        })
        break;
    case diffInDays >= 15:
        // console.log('Case 3: date is more than two weeks from now.');

        // Get Flight Rules Query
        // We hard coded MIA into the query, 
        // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access
        jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
            if (err || decoded == undefined) {
                return res.status(500).send({ message: 'Bad Token' });
                
            }
            // Not using the config query
            const query = `SELECT * FROM ultravi_ulav.flight_schedule_rules WHERE ${req.params.date} BETWEEN date_start AND date_end AND ${dayOfWeek} = true  AND (arrival_city = 'MIA'  OR departure_city = 'MIA');`;

            connectionPool.query(query, (err, response) => {
                if (err) {
                    console.log("Query Error: ", err);
                    return res.status(500).send({ message: 'Internal Server Error' });
                }
                // console.log(response);
                return res.status(200).send(response);
            });  
        })
        break;
    }


    

});

function boolToNumber(boolString) {
    tempBool = JSON.parse(boolString);
    if(tempBool){
        return 1;
    } else {
        return 0;
    }
}

module.exports = router;
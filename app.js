const express = require('express');
const cors = require('cors');
const config = require('./config/development');
const moment = require('moment');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const logger = require('./logger');
const https = require('https');
const fs = require('fs');


//#region =========================== Configuration of the server ===============================

const app = express()

var corsOptions = {
    origin: "*", // Origin is the IP of the Angular App making calls to this API
    // credentials: true
};

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({
    extended: true
}));

// Defining an object param for the mysql connectionPool to our database which we will use to make queries to our db
// It will be called only when necesary; Using async / await since connectionPool is async.
const connectionPool = mysql.createPool({
    connectionLimit: 100,
    host: 'localhost',
    user: 'dbadmin',
    password: 'Sql011235813',
    database: config.databaseName,
    multipleStatements: true,
    debug: false
})

// Save the connectionPool to the mysql instance so we can use it across the app.
mysql.connectionPool = connectionPool;

// Test Connection to database
connectionPool.getConnection((err, connection) => {
    if (err)
        throw err;
    console.log('Database connected successfully');
    connection.release();
});
//#endregion

// I am just here as remnants of an empty app, oh what simpler times.
app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.use('/api/user', require('./api/user'));

app.use('/api/role', require('./api/role'));

app.use('/api/task', require('./api/task'));

app.use('/api/rolestasks', require('./api/rolestasks'));

app.use('/api/userroles', require('./api/userroles'));

app.use('/api/documents', require('./api/documents'));

app.use('/api/airport', require('./api/airports'));

app.use('/api/airline', require('./api/airlines'));

app.use('/api/aircraft', require('./api/aircrafts'));

app.use('/api/client', require('./api/clients'));

app.use('/api/mailer', require('./api/mailer'));

app.use('/api/token', require('./api/token'));

app.use('/api/flightSchedule', require('./api/flightSchedule'));

app.use('/api/additionalServices', require('./api/additionalServices'));

//#region ============================ Authentication Region ===============================

// Extracted the functionality of the route '/auth/isTokenValid' as a function so I can use it in other places.
isTokenValid = async (token) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, config.privateKey, (err, decoded) => {
            if (err || decoded == undefined) {
                resolve({ 'response': false });
            }
            if (decoded !== undefined) {
                console.log(decoded);
                resolve({ 'response': !(decoded == null), 'data': decoded, });
            }
        });
    });
}


// POST /login gets urlencoded bodies
app.post('/auth/isTokenValid', async function (req, res) {
    isValidResponse = await isTokenValid(req.body.loginToken);
    res.json(isValidResponse);
});

// POST /login gets urlencoded bodies
app.post('/auth/local', function (req, res) {
    // console.log('someone logging in!');
    var currentUser;
    // Query database for user.

    // API Route to retrieve a specific user from the database as a JSON object
    connectionPool.query(config.queries.selectAllUsersQuery + ' WHERE username=?', [req.body.username], (err, results) => {
        if (err) {
            console.log("Query Error: ", err);
            throw err
        }

        currentUser = results;

        // If user does not exist, handle and return error
        if (currentUser === undefined || currentUser.length == 0) {
            console.log('User does not exist in database; Handle This error');
            res.sendStatus(403); // Incorrect Response, Handle this better
            // res.end();
        } else {

            // Since user exists, compare password of QueriedUser.password with req.body.password
            if (currentUser[0].password !== req.body.password) {
                console.log('Passwords do NOT match; Handle this error');
                // If passwords do not match, handle and return error
                res.sendStatus(403); // Incorrect Response, Handle this better
                // res.end();
            } else {
                console.log(`Username ${currentUser[0].username} just logged in at: ${ moment.unix(Date.now() / 1000).format('YYYY-MM-DD HH:mm:ss')}`);
                // logger.writeToLogFile(`Username ${currentUser[0].username} just logged in at: ${ moment.unix(Date.now() / 1000).format('YYYY-MM-DD HH:mm:ss')}\n`);
                // Log to daily Logfile:
                const dataToAppend = { action: 'login', username: currentUser[0].username, id: currentUser[0].id, timestamp: moment().unix(), readableTimestamp:moment.unix(Date.now() / 1000).format('YYYY-MM-DD HH:mm:ss') };
                const arrayName = 'login'; // Name of the array in the JSON file

                logger.writeToLogFile(dataToAppend, arrayName);


                // Since passwords match, generate and return JWT with username, expiration timestamp of 2 hours, and task
                const jwtBearerToken = jwt.sign({
                    _username: currentUser[0].username,
                    _id: currentUser[0].id,
                    task: currentUser[0].task,
                }, config.privateKey, {
                    algorithm: 'RS256',
                    expiresIn: config.tokenMaxAge,
                });

                // Return signed token
                res.json(jwtBearerToken);
            }
        }
    });
});


/**
 * Authentication function used to take in a valid JWT token and extend the lifecycle of the logged in token. May
 * be called twice on the same client action so account for that
 */
app.post('/auth/extendLogin', async function (req, res) {
    isValidResponse = await isTokenValid(req.body.loginToken);

    if(isValidResponse.response == false){
        // Token not valid, handle:
        res.json({ 'response': false });
        return;
    }

    isValidResponse.data._id
    // Since passwords match, generate and return JWT with username, expiration timestamp of 2 hours, and task
    const jwtBearerToken = jwt.sign({
        _username: isValidResponse.data._username,
        _id: isValidResponse.data._id,
    }, config.privateKey, {
        algorithm: 'RS256',
        expiresIn: config.tokenMaxAge,
    });

    // Return signed token
    res.json(jwtBearerToken);
})

/**
 * Authenticates requests based on user_id and task_id
 * returns true or false
 * used in isAuthenticated() in the front-end app.
 */
app.post('/auth/authenticateRequest', async function (req, res) {
    isValidResponse = await isTokenValid(req.body.loginToken);

    if(isValidResponse.response == false){
        // Token not valid, handle:
        res.json({ 'response': false });
        return;
    }

    // API Route to get all tasks available to the ID passed in the parameter.
    connectionPool.query(config.queries.allTasksAvailableToUserById, [isValidResponse.data._id], (err, results) => {
        if (err) {
            console.log("Query Error: ", err);
            throw err
        }
        // console.log('Tasks Available: \n', results);
        // Check if our task_id passed in as a parameter matches and of the task_id that way we can authenticate
        for (let i = 0; i < results.length; i++) {
            if (results[i].id === req.body.task_id) {
                res.json({ 'response': true });
                return;
            }
        }
        res.json({ 'response': false });
        return;
    });
})

/**
 * Function gets all tasks authorized to a user by USER id, NOT task id
 * returns a list of tasks which the user id passed in has access to.
 */
app.post('/auth/getTasksById', async function (req, res) {
    isValidResponse = await isTokenValid(req.body.loginToken);

    if(isValidResponse.response == false){
        // Token not valid, handle:
        res.json({ 'response': false });
        return;
    }

    // API Route to get all tasks available to the ID passed in the parameter.
    connectionPool.query(config.queries.allTasksAvailableToUserById, [isValidResponse.data._id], (err, results) => {
        if (err) {
            console.log("Query Error: ", err);
            throw err
        }
        res.json(results);
        return;
    });
})
//#endregion



/**
 * This is the job scheduler package we are using to trigger server calls at 2 am every day
 * For example, moving the 'day' over to the next day.
 */
cron.schedule('0 2 * * *', () => {  // Minute, hour, day of month (1-31), month (1-12), day of week (0,7 -> both 0 and 7 represent sunday) 
    // console.log('Running script at 2 am');

    /**   We should do a couple of things
     *    Flight buffer filling: We have to grab the item from 14 days away and insert it into the buffer
     *    Once we have inserted those days 
    */
    const secondsPerDay = 86400;
    //today is start of day in UTC (00:00:00)
    const today = moment.utc().startOf('day');
    // Day that the cron will generate. As of 10/4/2023 it is 16 days from today. Ie, OCT 4 @ 2 am est Generates OCT 20
    const dateToGenerate = today.clone().add((config.flightActivityLength + config.flightBufferLength),'days').unix();

    const localTimezoneOffset = Math.abs((moment(dateToGenerate * 1000).utcOffset() / 60)); // It comes out to -4 originally, so i took the math.abs of the number
    const dayOfWeek = moment((dateToGenerate + ((secondsPerDay / 24) * localTimezoneOffset ))* 1000).format('dddd').toLowerCase(); // Add 4 hours to timezone
    
    console.log('day of the week: ', dayOfWeek);
    // DATEDIFF(FROM_UNIXTIME(${dateToGenerate}), FROM_UNIXTIME(queryDateInside.date_start)) AS nth_flight_number
    // queryDateInside.date_start,
    
    let generateAndInsertLegsQuery = 
        `
        INSERT INTO ultravi_ulav.flight_schedule_buffer(
        generated_id, date, airline, client, 
        remarks, flight_number, scheduled_arrival_time, 
        scheduled_departure_time, arrival_city, 
        departure_city, next_leg_pointer, 
        ac_type, flightStatus)
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
                queryDateInside.ac_type,
                1
            FROM 
                (
                SELECT 
                    id, 
                    date_start,
                    CONCAT
                        (
                            id,
                            '-', 
                            (DATEDIFF(FROM_UNIXTIME(${dateToGenerate}), FROM_UNIXTIME(date_start)))
                        ) as generated_id, 
                    ${dateToGenerate} as date, 
                    airline, 
                    client, 
                    remarks, 
                    flight_number, 
                    (
                    ${dateToGenerate} + (
                        HOUR(scheduled_departure_time) * 3600
                    ) + (
                        MINUTE(scheduled_departure_time) * 60
                    )
                    ) as scheduled_departure_time, 
                    (
                    ${dateToGenerate} + (
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
                            (DATEDIFF(FROM_UNIXTIME(${dateToGenerate}), FROM_UNIXTIME(t.date_start)))  + (DATEDIFF(FROM_UNIXTIME(t.date_start), FROM_UNIXTIME(inner_queryDate.date_start)))
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
                        ${dateToGenerate} + (
                            HOUR(scheduled_departure_time) * 3600
                        ) + (
                            MINUTE(scheduled_departure_time) * 60
                        ) BETWEEN date_start 
                        AND date_end
                        ) 
                        AND ${dayOfWeek} = true
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
    
    
    // Changed the following section so that everything in the buffer BEFORE the date (which is today + 1) is moved over and subsequently deleted.
    
    // Move TODAY to flight Activity:
    let copyFromBufferToActivityQuery = 
        `INSERT INTO ultravi_ulav.flight_schedule_activity 
        (date, generated_id, airline, client, remarks, flight_number, scheduled_arrival_time, scheduled_departure_time, estimated_arrival_time, actual_arrival_time, estimated_departure_time, actual_departure_time, arrival_city, departure_city,next_leg_pointer,ac_type, ac_reg, pax, wheelchair_count, isSubservice, flightStatus)
        SELECT date, generated_id, airline, client, remarks, flight_number, scheduled_arrival_time, scheduled_departure_time, estimated_arrival_time, actual_arrival_time, estimated_departure_time,  actual_departure_time, arrival_city,departure_city,next_leg_pointer, ac_type, ac_reg, pax, wheelchair_count, isSubservice, flightStatus
        FROM ultravi_ulav.flight_schedule_buffer
        WHERE date <= ${today.clone().add(1,'days').unix()}`;

    connectionPool.query(copyFromBufferToActivityQuery, (err, response) => {
        if (err) {
            console.log("Query Error: ", err);
            throw err
        }

        // Data base been copied, delete the rest?
        connectionPool.query(`DELETE FROM ultravi_ulav.flight_schedule_buffer WHERE date <= ${today.clone().add(1,'days').unix()}`, (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                throw err
            }
            // Data base been copied, delete the rest?
            
        });
    });
    
});

/** ========= DEPRECATED?!?!?! =================
 * Generated Leg ID is now of the format: {rule.id} + '' + {generatedTimestamp}
 * the generated timestamp is the STD of the leg in UTC.
 * If a flight leaves at 07:00 UTC, we add (7 * 3600) to 00:00 UTC on the date of the query and that's our
 * Timestamp for the flight departing. 
 * Ex: Rule id is 5, Wed May 31 2023 00:00:00 GMT+0000 = 1685491200. STD = 07:00.
 * (1685491200 + (7 * 3600)) => 1685516400.
 * Generated ID: 5 + '' + 1685516400 => 51685516400
 */
generateBufferID = function(databaseObject, todayDateTimeStamp){
    let uniqueBufferID = todayDateTimeStamp + '-' + databaseObject.airline + '-' + databaseObject.flight_number + '-' + databaseObject.scheduled_departure_time
    return uniqueBufferID;
}


// Check the environment (development or production)
const isProduction = process.env.NODE_ENV === 'production';
console.log(isProduction);

// Create an HTTPS server if in production
let httpsServer;
if (isProduction) {
  // Load SSL/TLS certificate and private key
  const privateKey = fs.readFileSync('../keycopy/privkey.pem', 'utf8');
  const certificate = fs.readFileSync('../keycopy/fullchain.pem', 'utf8');
  const credentials = { key: privateKey, cert: certificate };

  // Create the HTTPS server
  httpsServer = https.createServer(credentials, app);

  // Listen on the appropriate production port
  const PORT = process.env.PORT || 3000;
  httpsServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
  });
} else {
  // In development, use HTTP instead
  const httpServer = app.listen(3000, () => {
    console.log('Server is running on port 3000 in development.');
  });
}
// Remove me one development starts, this is for testing request parameters in the API
// console.log("Request: \n" + util.inspect(req.params, {showHidden: false, depth: null, colors: true}))
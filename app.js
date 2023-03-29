const express = require('express');
const cors = require('cors');
const config = require('./config/development');

const jwt = require('jsonwebtoken');
const mysql = require('mysql2');


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

app.use('/api/mailer', require('./api/mailer'));

app.use('/api/token', require('./api/token'));

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
    console.log('someone logging in!');
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

// set port, listen for requests
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});

// Remove me one development starts, this is for testing request parameters in the API
// console.log("Request: \n" + util.inspect(req.params, {showHidden: false, depth: null, colors: true}))
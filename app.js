const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config/development');

const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const fs = require("fs");
const mysql = require('mysql2');

// Defining an object param for the mysql connection to our database which we will use to make queries to our db
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'dbadmin',
    password: 'Sql011235813',
    database: 'portal_development'
})

// Defining an object param for the mysql connectionPool to our database which we will use to make queries to our db
const connectionPool = mysql.createPool({
    connectionLimit: 100,
    host: 'localhost',
    user: 'dbadmin',
    password: 'Sql011235813',
    database: 'portal_development',
    debug: false
})



const app = express()


connection.connect(function(err) {

    if (err) {
        return console.error('error connecting to the database: \n' + err.message);
    }

    console.log('Successfully connected to the MySQL server.');


    const RSA_PRIVATE_KEY = fs.readFileSync('./assets/private.key');

    var corsOptions = {
        origin: "http://localhost:4200", // Origin is the IP of the Angular App making calls to this API
        // credentials: true
    };

    app.use(cors(corsOptions));


    // parse requests of content-type - application/json
    app.use(express.json());

    // parse requests of content-type - application/x-www-form-urlencoded
    app.use(express.urlencoded({
        extended: true
    }));

    app.get('/', (req, res) => {
        res.send('Hello World!')
    })

    // ----------------------------- User section -----------------------------------

    // Query for our database that returns All users from our user table, we can then append more instructions to the query to make it fit our needs
    const getQuery = "SELECT * FROM portal_development.table_users_development"

    // POST /login gets urlencoded bodies
    app.post('/auth/local', function(req, res) {
        var currentUser;
        // Query database for user.
        
        // API Route to retrieve a specific user from the database as a JSON object
        connection.query(getQuery +' where username=?',[req.body.username], (err, results) => {
            if (err) {
                console.log("Query Error: ", err);
                throw err
            }

            currentUser = results;

            // If user does not exist, handle and return error
            if(currentUser === undefined || currentUser.length == 0){
                console.log('User does not exist in database; Handle This error');
                res.sendStatus(403); // Incorrect Response, Handle this better
                // res.end();
            } else {
                
                // Since user exists, compare password of QueriedUser.password with req.body.password
                if(currentUser[0].password !== req.body.password){
                    console.log('Passwords do NOT match; Handle this error');
                    // If passwords do not match, handle and return error
                    res.sendStatus(403); // Incorrect Response, Handle this better
                    // res.end();
                } else {
                    // Since passwords match, generate and return JWT with username, expiration timestamp of 2 hours, and role
                    const jwtBearerToken = jwt.sign({
                        _username: currentUser[0].username,
                        role: currentUser[0].role,
                    }, RSA_PRIVATE_KEY, {
                        algorithm: 'RS256',
                        expiresIn: config.tokenMaxAge,
                    });
                    
                    // Return signed token
                    res.json(jwtBearerToken);
                }
            }
        });
    })

    // POST /login gets urlencoded bodies
    app.get('/getDataFromServer', async function(req, res) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        res.json({
            'Super Secret Data': 'Payload'
        });
    })

    /**
     * API Route to retrieve a specific user from the database as a JSON object
     * Asynchronously handles the query to the database thanks to using the connection pool,
     * the pool.query method is a shrotcut since it handles the connection.release() for us, we
     * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
     */
    app.get("/api/userById/:id", async (req, res) => {
        // now get a Promise wrapped instance of that connectionPool
        const promisePool = connectionPool.promise();

        const [users, fields] = await promisePool.query(getQuery +' where id=?',[req.params.id], (err, results) => {
            if (err) throw err
            // await new Promise(resolve => setTimeout(resolve, 5000));

            // Results are returned as [rows, fields], so if we only return the first result, that's our users
            return results;
        })

        // We want to return the first item in the users array, thus the indexing [0]
        res.json(users[0]);
    });

    /**
     * API Route to retrieve a specific user from the database as a JSON object
     * Asynchronously handles the query to the database thanks to using the connection pool,
     * the pool.query method is a shrotcut since it handles the connection.release() for us, we
     * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
     */
    app.get("/api/userByUsername/:username", async (req, res) => {
        // now get a Promise wrapped instance of that connectionPool
        const promisePool = connectionPool.promise();

        const [users, fields] = await promisePool.query(getQuery +' where username=?',[req.params.username], (err, results) => {
            if (err) throw err
            // await new Promise(resolve => setTimeout(resolve, 5000));

            // Results are returned as [rows, fields], so if we only return the first result, that's our users
            return results;
        })
        
        // We want to return the first item in the users array, thus the indexing [0]
        res.json(users[0]);
    });


    // set port, listen for requests
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}.`);
    });
});


// Remove me one development starts, this is for testing request parameters in the API
// console.log("Request: \n" + util.inspect(req.params, {showHidden: false, depth: null, colors: true}))
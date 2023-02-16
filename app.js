const express = require('express');
const cors = require('cors');
const config = require('./config/development');

const jwt = require('jsonwebtoken');
const mysql = require('mysql2');


//#region =========================== Configuration of the server ===============================

const app = express()

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

// Test Connection to database
connectionPool.getConnection((err, connection) => {
    if (err)
        throw err;
    console.log('Database connected successfully');
    connection.release();
});
//#endregion

//#region ============================ Predefined Queries Region ===============================

// ====== Users Table ======
const selectAllUsersQuery = 'SELECT * FROM ' + config.databaseName + '.users'
const countUsersQuery = 'SELECT COUNT(id) as user_count FROM ' + config.databaseName + '.users'
const deleteUserQuery = 'DELETE FROM ' + config.databaseName + '.users WHERE id=?'
const addUserQuery = 'INSERT INTO ' + config.databaseName + '.users (username, password, salt, hint, location, airline, active, hr_employee, role, created, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?);'
const updateUserQuery = 'UPDATE  ' + config.databaseName + '.users SET username = ?, password = ?, salt = ?, hint = ?, location = ?, airline = ?, active = ?, hr_employee = ?, role = ?, created = ?, created_by = ? WHERE id = ?'

// ====== Roles Table ======

const selectAllRolesQuery = 'SELECT * FROM ' + config.databaseName + '.roles'
const updateRoleQuery = 'UPDATE  ' + config.databaseName + '.roles SET name = ?, description = ?, created = ?, created_by = ? WHERE id = ?'
const addRoleQuery = 'INSERT INTO ' + config.databaseName + '.roles (name, description, created, created_by) VALUES (?,?,?,?);'

// ====== Tasks Table ======

const selectAllTasksQuery = 'SELECT * FROM ' + config.databaseName + '.tasks'
const updateTaskQuery = 'UPDATE  ' + config.databaseName + '.tasks SET description = ? WHERE id = ?'
const addTaskQuery = 'INSERT INTO ' + config.databaseName + '.tasks (description) VALUES (?);'

// ====== Role-Tasks Table ======

const selectAllRolesTasksQuery = 'SELECT * FROM ' + config.databaseName + '.roles_tasks'
const selectAllRolesTasksByIdQuery = 'SELECT * FROM ' + config.databaseName + '.roles_tasks WHERE role_id=?'

// ====== User-Roles Table ======

const selectUserRolesById = 'SELECT * FROM ' + config.databaseName + '.users_roles WHERE user_id=?'

// ====== Authentication Queries ======

const allTasksAvailableToUserById = 'SELECT tasks.* FROM tasks JOIN roles_tasks ON tasks.id = roles_tasks.task_id JOIN roles ON roles_tasks.role_id = roles.id JOIN users_roles ON roles.id = users_roles.role_id JOIN users ON users_roles.user_id = users.id WHERE users.id =?;'


//#endregion

// I am just here as remnants of an empty app, oh what simpler times.
app.get('/', (req, res) => {
    res.send('Hello World!')
})

//#region ============================ User Region ============================ 

/**
 * API Route to retrieve all users from the database as a JSON object
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
app.get("/api/user/getAllUsers", authenticateRequest(1), async (req, res) => {
    // now get a Promise wrapped instance of that connectionPool
    //console.log('logintoken:  ', req.headers.logintoken);
    let response = await connectionPool.promise().execute(selectAllUsersQuery);
    res.json(response);
});

/**
 * API Route to retrieve a specific user from the database as a JSON object
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
app.get("/api/user/userById/:id", async (req, res) => {
    // now get a Promise wrapped instance of that connectionPool
    const promisePool = connectionPool.promise();

    const [users, fields] = await promisePool.query(selectAllUsersQuery + ' WHERE id=?', [req.params.id], (err, results) => {
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

    const [users, fields] = await promisePool.query(selectAllUsersQuery + ' WHERE username=?', [req.params.username], (err, results) => {
        if (err) throw err
        // await new Promise(resolve => setTimeout(resolve, 5000));

        // Results are returned as [rows, fields], so if we only return the first result, that's our users
        return results;
    })

    // We want to return the first item in the users array, thus the indexing [0]
    res.json(users[0]);
});

/**
 * API Route to add a user from the database.
 * <NOT IMPLEMENTED> First we much authenticate the request and check if the user has the permission to addUser
 * Second we must check if the username is taken.
 * Now we must build the object with all the data necessary that is missing, ie: created: date; createdBy: <user>.
 */
app.post("/api/user/addUser", async (req, res) => {
    try {
        let _created_by = '';
        // ============= Authentication / Validation goes here =============

        // Authenticate that the token is valid, otherwise the error will be caught in the catch()
        const decodedToken = jwt.verify(req.body.loginToken, config.publicKey);
        _created_by = decodedToken._username;

        // Verify that the requesting user has the required role for this operations.


        // ============= End of validation =============

        // Building the object we are going to put on our database
        this.userToAdd = {
            username: req.body.formValue.username,
            password: req.body.formValue.password,
            salt: '',
            hint: 'None',
            location: req.body.formValue.location,
            airline: 'ULA', // Not implemented correctly
            active: 'Y', // We are assuming an employee being created MUST be active, thus defaulting to Y.
            hr_employee: 'None',
            role: '4', // Not implemented correctly, Also it's text, not an Int
            created: new Date(),
            created_by: _created_by
        }

        console.log(this.userToAdd);
        // now get a Promise wrapped instance of that connectionPool
        const promisePool = connectionPool.promise();

        const [QueryResponse, fields] = await promisePool.query(addUserQuery,
            [this.userToAdd.username,
            this.userToAdd.password,
            this.userToAdd.salt,
            this.userToAdd.hint,
            this.userToAdd.location,
            this.userToAdd.airline,
            this.userToAdd.active,
            this.userToAdd.hr_employee,
            this.userToAdd.role,
            this.userToAdd.created,
            this.userToAdd.created_by
            ], (error, results) => {
                if (error) return res.json({ error: error });
                console.log('Results From Add Query:\n', results);

                // Results are returning information about the successful Query
                return results;
            });

        res.json(QueryResponse);

        // res.json({'id': 1}); commented out since we're re-enabling user add. This is for credential checking when we comment the above statement.
    }
    catch (err) {
        console.log(err.message);
        return err;
    }
});


/**
 * API Route to update a user from the database.
 * <NOT IMPLEMENTED> First we much authenticate the request and check if the user has the permission to addUser
 * <I dont know if mysql autoincrements the ID, so if it doesnt we must check db size and manually set id>
 * Now we must build the object with all the data necessary that is missing, ie: created: date; createdBy: <user>.
 */
app.post("/api/user/updateUser", async (req, res) => {
    // id of the user we are updating, Storing for the redirect at the end
    let _userId = req.body.id;
    // ============= Authentication / Validation goes here =============

    // ============= End of validation =============

    // now get a Promise wrapped instance of that connectionPool
    const promisePool = connectionPool.promise();

    const [QueryResponse, fields] = await promisePool.query(updateUserQuery,
        [req.body.username,
        req.body.password,
        req.body.salt,
        req.body.hint,
        req.body.location,
        req.body.airline,
        req.body.active,
        req.body.hr_employee,
        req.body.role,
        req.body.created.slice(0, -1), // we are removing the Z at the end of the string to indicate Zulu time. This won't be needed when our objects are dates
        req.body.created_by,
        req.body.id // WHERE id = ? 
        ], (error, results) => {
            if (error) return res.json({ error: error });
            console.log('Results From Update User Query:\n', results);

            // Results are returning information about the successful Query
            return results;
        });
    res.json({ 'response': QueryResponse, userId: _userId });
});

/**
 * API Route to delete a user from the database.
 * <NOT IMPLEMENTED> First we much authenticate the request and check if the user has the permission to addUser
 * Now we must build the object with all the data necessary that is missing, ie: created: date; createdBy: <user>.
 */
app.post("/api/user/deleteUser", async (req, res) => {
    // ============= Authentication / Validation goes here =============


    // ============= End of validation =============

    // now get a Promise wrapped instance of that connectionPool
    const promisePool = connectionPool.promise();

    const [QueryResponse, fields] = await promisePool.query(deleteUserQuery, [req.body.id], (error, results) => {
        if (error) return res.json({ error: error });
        console.log('Results From Add Query:\n', results);

        // Results are returning information about the successful Delete Query
        return results;
    });
    res.json(QueryResponse);
});
//#endregion

//#region ============================ Roles Region ============================ 

/**
 * API Route to retrieve all roles from the database as a JSON object
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
app.get("/api/role/getAllRoles", async (req, res) => {
    // now get a Promise wrapped instance of that connectionPool

    let response = await connectionPool.promise().execute(selectAllRolesQuery);

    // The response is in the format of ([data],[buff]); We will return both since we handle taking only the data in the role service
    res.json(response);
});

/**
 * API Route to retrieve a specific role from the database as a JSON object
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
app.get("/api/role/roleById/:id", async (req, res) => {
    // now get a Promise wrapped instance of that connectionPool
    const promisePool = connectionPool.promise();

    const [roles, fields] = await promisePool.query(selectAllRolesQuery + ' WHERE id=?', [req.params.id], (err, results) => {
        if (err) throw err
        // await new Promise(resolve => setTimeout(resolve, 5000));

        // Results are returned as [rows, fields], so if we only return the first result, that's our users
        return results;
    })

    // We want to return the first item in the users array, thus the indexing [0]
    res.json(roles[0]);
});

/**
 * API Route to add a role from the database.
 * <NOT IMPLEMENTED> First we much authenticate the request and check if the user has the permission to addUser
 * Second we must check if the username is taken.
 * Now we must build the object with all the data necessary that is missing, ie: created: date; createdBy: <user>.
 */
app.post("/api/role/addRole", async (req, res) => {
    try {
        let _created_by = '';
        // ============= Authentication / Validation goes here =============

        // Authenticate that the token is valid, otherwise the error will be caught in the catch()
        const decodedToken = jwt.verify(req.body.loginToken, config.publicKey);
        _created_by = decodedToken._username;

        // Verify that the requesting user has the required role for this operations.


        // ============= End of validation =============

        // Building the object we are going to put on our database
        this.roleToAdd = {
            name: req.body.formValue.name,
            description: req.body.formValue.description,
            created: new Date(),
            created_by: _created_by
        }

        console.log(this.roleToAdd);
        // now get a Promise wrapped instance of that connectionPool
        const promisePool = connectionPool.promise();

        const [QueryResponse, fields] = await promisePool.query(addRoleQuery,
            [this.roleToAdd.name,
            this.roleToAdd.description,
            this.roleToAdd.created,
            this.roleToAdd.created_by
            ], (error, results) => {
                if (error) return res.json({ error: error });
                console.log('Results From Add Query:\n', results);

                // Results are returning information about the successful Query
                return results;
            });

        res.json(QueryResponse);
    }
    catch (err) {
        console.log(err.message);
        return err;
    }
});

/**
 * API Route to update a role from the database.
 * <NOT IMPLEMENTED> First we much authenticate the request and check if the user has the permission to updateRole
 * <I dont know if mysql autoincrements the ID, so if it doesnt we must check db size and manually set id>
 * Now we must build the object with all the data necessary that is missing, ie: created: date; createdBy: <user>.
 */
app.post("/api/role/updateRole", async (req, res) => {
    // id of the user we are updating, Storing for the redirect at the end
    let _roleId = req.body.id;
    // ============= Authentication / Validation goes here =============

    // ============= End of validation =============

    // now get a Promise wrapped instance of that connectionPool
    const promisePool = connectionPool.promise();

    const [QueryResponse, fields] = await promisePool.query(updateRoleQuery,
        [req.body.name,
        req.body.description,
        req.body.created.slice(0, -1), // we are removing the Z at the end of the string to indicate Zulu time. This won't be needed when our objects are dates
        req.body.created_by,
        req.body.id // WHERE id = ? 
        ], (error, results) => {
            if (error) return res.json({ error: error });
            console.log('Results From Update User Query:\n', results);

            // Results are returning information about the successful Query
            return results;
        });
    res.json({ 'response': QueryResponse, roleId: _roleId });
});

//#endregion

//#region ============================ Tasks Region ============================

/**
 * API Route to retrieve all tasks from the database as a JSON object
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
app.get("/api/tasks/getAllTasks", async (req, res) => {
    // now get a Promise wrapped instance of that connectionPool

    let response = await connectionPool.promise().execute(selectAllTasksQuery);

    // The response is in the format of ([data],[buff]); We will return both since we handle taking only the data in the task service
    res.json(response);
});

/**
 * API Route to retrieve a specific task from the database as a JSON object
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
app.get("/api/task/taskById/:id", async (req, res) => {
    // now get a Promise wrapped instance of that connectionPool
    const promisePool = connectionPool.promise();

    const [tasks, fields] = await promisePool.query(selectAllTasksQuery + ' WHERE id=?', [req.params.id], (err, results) => {
        if (err) throw err
        // await new Promise(resolve => setTimeout(resolve, 5000));

        // Results are returned as [rows, fields], so if we only return the first result, that's our users
        return results;
    })

    // We want to return the first item in the users array, thus the indexing [0]
    res.json(tasks[0]);
});

/**
 * API Route to add a task from the database.
 * <NOT IMPLEMENTED> First we much authenticate the request and check if the user has the permission to addUser
 * Second we must check if the username is taken.
 * Now we must build the object with all the data necessary that is missing, ie: created: date; createdBy: <user>.
 */
app.post("/api/task/addTask", async (req, res) => {
    try {
        let _created_by = '';
        // ============= Authentication / Validation goes here =============

        // Authenticate that the token is valid, otherwise the error will be caught in the catch()
        const decodedToken = jwt.verify(req.body.loginToken, config.publicKey);
        _created_by = decodedToken._username;

        // Verify that the requesting user has the required task for this operations.


        // ============= End of validation =============

        // Building the object we are going to put on our database
        this.taskToAdd = {
            description: req.body.formValue.description,
        }

        console.log(this.taskToAdd);
        // now get a Promise wrapped instance of that connectionPool
        const promisePool = connectionPool.promise();

        const [QueryResponse, fields] = await promisePool.query(addTaskQuery,
            [this.taskToAdd.description
            ], (error, results) => {
                if (error) return res.json({ error: error });
                console.log('Results From Add Query:\n', results);

                // Results are returning information about the successful Query
                return results;
            });

        res.json(QueryResponse);
    }
    catch (err) {
        console.log(err.message);
        return err;
    }
});

/**
 * API Route to update a task from the database.
 * <NOT IMPLEMENTED> First we much authenticate the request and check if the user has the permission to updateRole
 * <I dont know if mysql autoincrements the ID, so if it doesnt we must check db size and manually set id>
 * Now we must build the object with all the data necessary that is missing, ie: created: date; createdBy: <user>.
 */
app.post("/api/task/updateTask", async (req, res) => {
    // id of the user we are updating, Storing for the redirect at the end
    let _taskId = req.body.id;
    // ============= Authentication / Validation goes here =============

    // ============= End of validation =============

    // now get a Promise wrapped instance of that connectionPool
    const promisePool = connectionPool.promise();

    const [QueryResponse, fields] = await promisePool.query(updateTaskQuery,
        [req.body.description,
        req.body.id // WHERE id = ? 
        ], (error, results) => {
            if (error) return res.json({ error: error });
            console.log('Results From Update User Query:\n', results);

            // Results are returning information about the successful Query
            return results;
        });
    res.json({ 'response': QueryResponse, taskId: _taskId });
});
//#endregion

//#region ============================ Role-Tasks Region ============================

/**
 * API Route to retrieve all role-tasks from the database by role_id as a JSON object
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
app.get("/api/rolestasks/getAllRolesTasksById/:id", async (req, res) => {
    // now get a Promise wrapped instance of that connectionPool

    let response = await connectionPool.promise().execute(selectAllRolesTasksByIdQuery, [req.params.id]);

    // The response is in the format of ([data],[buff]); We will return both since we handle taking only the data in the role service
    res.json(response);
});

/**
 * API Route to update roles-tasks table from the queries passed as an array
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
app.post("/api/rolestasks/updateRolesTasksTable", async (req, res) => {
    // req.body is the array of queries, let's perform them all
    let newArray = [];

    // Here we're preparing the sql statements by inserting the parametized database name and table names.
    // We hid these from the front end for security reasons.
    for (let i = 0; i < req.body.length; i++) {
        newStr = req.body[i].replace('DATABASE_NAME', config.databaseName);
        newStr = newStr.replace('TABLE_NAME', 'roles_tasks');
        newArray.push(newStr);
    }

    // We're going to return an array of responses, let's initialize the return array before we fill it
    let response = [];

    // For every query in newArray, perform the query asynchronously and return the response pushed into response[]
    for (const query of newArray) {
        console.log('query: ', query);
        await new Promise(async resolve => {
            response.push(await connectionPool.promise().execute(query));
            resolve();
        })
    }

    res.json(response);
});


//#endregion

//#region ============================ User-Roles Region ============================

/**
 * API Route to retrieve user-roles from the database by user_id as a JSON object
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
app.get("/api/userRoles/getUserRolesById/:id", async (req, res) => {
    let [response, buffer] = await connectionPool.promise().execute(selectUserRolesById, [req.params.id]);
    res.json(response);
});

/**
 * API Route to update users-roles table from the queries passed as an array
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
app.post("/api/userRoles/updateUserRolesTable", async (req, res) => {
    // req.body is the array of queries, let's perform them all
    let newArray = [];

    // Here we're preparing the sql statements by inserting the parametized database name and table names.
    // We hid these from the front end for security reasons.
    for (let i = 0; i < req.body.length; i++) {
        newStr = req.body[i].replace('DATABASE_NAME', config.databaseName);
        newStr = newStr.replace('TABLE_NAME', 'users_roles');
        newArray.push(newStr);
    }

    // We're going to return an array of responses, let's initialize the return array before we fill it
    let response = [];

    // For every query in newArray, perform the query asynchronously and return the response pushed into response[]
    for (const query of newArray) {
        console.log('query: ', query);
        await new Promise(async resolve => {
            response.push(await connectionPool.promise().execute(query));
            resolve();
        })
    }

    res.json(response);
});

//#endregion

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
    var currentUser;
    // Query database for user.

    // API Route to retrieve a specific user from the database as a JSON object
    connectionPool.query(selectAllUsersQuery + ' WHERE username=?', [req.body.username], (err, results) => {
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
 */
app.post('/auth/authenticateRequest', async function (req, res) {
    isValidResponse = await isTokenValid(req.body.loginToken);

    if(isValidResponse.response == false){
        // Token not valid, handle:
        res.json({ 'response': false });
        return;
    }

    // API Route to get all tasks available to the ID passed in the parameter.
    connectionPool.query(allTasksAvailableToUserById, [isValidResponse.data._id], (err, results) => { //Hard Coding the ID to 1 for testing
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
//#endregion

//#region ============================ Test Region ===============================

// POST /login gets urlencoded bodies
app.get('/getDataFromServer', async function (req, res) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    res.json({
        'Super Secret Data': 'Payload'
    });
})
//#endregion

// set port, listen for requests
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});

// ============================ Middleware Region ===============================


/**
 * This function is a middleware to ensure that the required route is protected.
 * We verify that the user making the request has the task assigned to them to ensure
 * that they can perform this request
 */
function authenticateRequest(task_id) {
    return function (req, res, next) {
        // console.log(req.headers.logintoken);

        jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
            if (err || decoded == undefined) {
                return res.status(500).send({ message: 'Bad Token' });
            }
            if (decoded !== undefined) {
                // API Route to get all tasks available to the ID passed in the parameter.
                connectionPool.query(allTasksAvailableToUserById, [decoded._id], (err, results) => {
                    if (err) {
                        console.log("Query Error: ", err);
                        return res.status(500).send({ message: 'Internal Server Error' });
                    }

                    // Check if our task_id parameter matches any of the task_ids returned by the query
                    const foundTask = results.find(task => task.id === task_id);
                    if (foundTask) {
                        // Task is authorized, move on to the next middleware
                        next();
                    } else {
                        // Task is not authorized, return an error response
                        return res.status(403).send({ message: 'Forbidden' });
                    }
                });
            }
        })
    }
}


// Remove me one development starts, this is for testing request parameters in the API
// console.log("Request: \n" + util.inspect(req.params, {showHidden: false, depth: null, colors: true}))
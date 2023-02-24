const express = require('express');
const router = express.Router();
const config = require('../../config/development');
const mysql = require('mysql2');
const auth = require('../../auth/');

const connectionPool = mysql.connectionPool;

/**
 * API Route to retrieve all users from the database as a JSON object
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
router.get("/getAllUsers", auth.authenticateRequest(1),async (req, res) => {
    // now get a Promise wrapped instance of that connectionPool
    //console.log('logintoken:  ', req.headers.logintoken);
    let response = await connectionPool.promise().execute(config.queries.selectAllUsersQuery);
    res.json(response);
});

/**
 * API Route to retrieve a specific user from the database as a JSON object
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
router.get("/userById/:id", async (req, res) => {
    // now get a Promise wrapped instance of that connectionPool
    const promisePool = connectionPool.promise();

    const [users, fields] = await promisePool.query(config.queries.selectAllUsersQuery + ' WHERE id=?', [req.params.id], (err, results) => {
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
router.get("/userByUsername/:username", async (req, res) => {
    // now get a Promise wrapped instance of that connectionPool
    const promisePool = connectionPool.promise();

    const [users, fields] = await promisePool.query(config.queries.selectAllUsersQuery + ' WHERE username=?', [req.params.username], (err, results) => {
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
router.post("/addUser", async (req, res) => {
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

        const [QueryResponse, fields] = await promisePool.query(config.queries.addUserQuery,
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
router.post("/updateUser", async (req, res) => {
    // id of the user we are updating, Storing for the redirect at the end
    let _userId = req.body.id;
    // ============= Authentication / Validation goes here =============

    // ============= End of validation =============

    // now get a Promise wrapped instance of that connectionPool
    const promisePool = connectionPool.promise();

    const [QueryResponse, fields] = await promisePool.query(config.queries.updateUserQuery,
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
router.post("/deleteUser", async (req, res) => {
    // ============= Authentication / Validation goes here =============


    // ============= End of validation =============

    // now get a Promise wrapped instance of that connectionPool
    const promisePool = connectionPool.promise();

    const [QueryResponse, fields] = await promisePool.query(config.queries.deleteUserQuery, [req.body.id], (error, results) => {
        if (error) return res.json({ error: error });
        console.log('Results From Add Query:\n', results);

        // Results are returning information about the successful Delete Query
        return results;
    });
    res.json(QueryResponse);
});

module.exports = router;
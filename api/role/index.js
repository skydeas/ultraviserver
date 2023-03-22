const express = require('express');
const router = express.Router();
const config = require('../../config/development');
const mysql = require('mysql2');
const auth = require('../../auth/');
const jwt = require('jsonwebtoken');

const connectionPool = mysql.connectionPool;

/**
 * API Route to retrieve all roles from the database as a JSON object
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
router.get("/getAllRoles", async (req, res) => {
    // now get a Promise wrapped instance of that connectionPool

    let response = await connectionPool.promise().execute(config.queries.selectAllRolesQuery);

    // The response is in the format of ([data],[buff]); We will return both since we handle taking only the data in the role service
    res.json(response);
});

/**
 * API Route to retrieve a specific role from the database as a JSON object
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
router.get("/roleById/:id", async (req, res) => {
    // now get a Promise wrapped instance of that connectionPool
    const promisePool = connectionPool.promise();

    const [roles, fields] = await promisePool.query(config.queries.selectAllRolesQuery + ' WHERE id=?', [req.params.id], (err, results) => {
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
router.post("/addRole", async (req, res) => {
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

        const [QueryResponse, fields] = await promisePool.query(config.queries.addRoleQuery,
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
router.post("/updateRole", async (req, res) => {
    // id of the user we are updating, Storing for the redirect at the end
    let _roleId = req.body.id;
    // ============= Authentication / Validation goes here =============

    // ============= End of validation =============

    // now get a Promise wrapped instance of that connectionPool
    const promisePool = connectionPool.promise();

    const [QueryResponse, fields] = await promisePool.query(config.queries.updateRoleQuery,
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

module.exports = router;
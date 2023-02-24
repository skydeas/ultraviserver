const express = require('express');
const router = express.Router();
const config = require('../../config/development');
const mysql = require('mysql2');
const auth = require('../../auth/');

const connectionPool = mysql.connectionPool;

/**
 * API Route to retrieve user-roles from the database by user_id as a JSON object
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
router.get("/getUserRolesById/:id", async (req, res) => {
    let [response, buffer] = await connectionPool.promise().execute(config.queries.selectUserRolesById, [req.params.id]);
    res.json(response);
});

/**
 * API Route to update users-roles table from the queries passed as an array
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
router.post("/updateUserRolesTable", async (req, res) => {
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

module.exports = router;
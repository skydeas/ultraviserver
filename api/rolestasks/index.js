const express = require('express');
const router = express.Router();
const config = require('../../config/development');
const mysql = require('mysql2');
const auth = require('../../auth/');

const connectionPool = mysql.connectionPool;

/**
 * API Route to retrieve all role-tasks from the database by role_id as a JSON object
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
router.get("/getAllRolesTasksById/:id", async (req, res) => {
    // now get a Promise wrapped instance of that connectionPool

    let response = await connectionPool.promise().execute(config.queries.selectAllRolesTasksByIdQuery, [req.params.id]);

    // The response is in the format of ([data],[buff]); We will return both since we handle taking only the data in the role service
    res.json(response);
});

/**
 * API Route to update roles-tasks table from the queries passed as an array
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
router.post("/updateRolesTasksTable", async (req, res) => {
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


module.exports = router;
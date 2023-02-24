const express = require('express');
const router = express.Router();
const config = require('../../config/development');
const mysql = require('mysql2');
const auth = require('../../auth/');

const connectionPool = mysql.connectionPool;

/**
 * API Route to retrieve all tasks from the database as a JSON object
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
router.get("/getAllTasks", async (req, res) => {
    // now get a Promise wrapped instance of that connectionPool

    let response = await connectionPool.promise().execute(config.queries.selectAllTasksQuery);

    // The response is in the format of ([data],[buff]); We will return both since we handle taking only the data in the task service
    res.json(response);
});

/**
 * API Route to retrieve a specific task from the database as a JSON object
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
router.get("/taskById/:id", async (req, res) => {
    // now get a Promise wrapped instance of that connectionPool
    const promisePool = connectionPool.promise();

    const [tasks, fields] = await promisePool.query(config.queries.selectAllTasksQuery + ' WHERE id=?', [req.params.id], (err, results) => {
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
router.post("/addTask", async (req, res) => {
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

        const [QueryResponse, fields] = await promisePool.query(config.queries.addTaskQuery,
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
router.post("/updateTask", async (req, res) => {
    // id of the user we are updating, Storing for the redirect at the end
    let _taskId = req.body.id;
    // ============= Authentication / Validation goes here =============

    // ============= End of validation =============

    // now get a Promise wrapped instance of that connectionPool
    const promisePool = connectionPool.promise();

    const [QueryResponse, fields] = await promisePool.query(config.queries.updateTaskQuery,
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

module.exports = router;
const config = require('../config/development');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');

const connectionPool = mysql.connectionPool;


module.exports = {
    /**
     * This function is a middleware to ensure that the required route is protected.
     * We verify that the user making the request has the task assigned to them to ensure
     * that they can perform this request
     */
     authenticateRequest(task_id) {
        return function (req, res, next) {
            // console.log(req.headers.logintoken);

            jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
                if (err || decoded == undefined) {
                    return res.status(500).send({ message: 'Bad Token' });
                }
                if (decoded !== undefined) {
                    // API Route to get all tasks available to the ID passed in the parameter.
                    connectionPool.query(config.queries.allTasksAvailableToUserById, [decoded._id], (err, results) => {
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
}
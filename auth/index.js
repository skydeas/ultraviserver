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
     authenticateRequest(task) {
        return function (req, res, next) {
            // console.log(req.headers.logintoken);

            jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
                if (err) {
                    //console.error(err); // Log the error for debugging purposes.
    
                    if (err.message === 'jwt expired') {
                        // Handle the case of an expired token
                        console.log('Token expired at:', err.expiredAt);
                        // Perform actions like clearing the token from local storage
                        // Redirect the user to the login page or take any other necessary steps
    
                        return res.status(401).send({ message: 'Token expired' });
                    }
    
                    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.NotBeforeError) {
                        // Handle other token verification errors
                        console.log('Invalid Token in authenticateRequest, printing token: ' + req.headers.logintoken);
                        console.log('Request URL:', req.url);


                        return res.status(401).send({ message: 'Invalid token' });
                    }
                    
                    // Other unexpected errors
                    return res.status(500).send({ message: 'Internal Server Error' });
                }

                if (decoded !== undefined) {
                    //console.log(decoded);

                    // const timeUntilExpiry = decoded.exp - Math.floor(Date.now() / 1000);
                    // if (timeUntilExpiry < 1800) { // 1800 seconds = 30 minutes
                    //     // Regenerate the token
                    //     // Generate new JWT Token using the same logic as the login function
                    //     const jwtBearerToken = jwt.sign({
                    //         _username: decoded._username,
                    //         _id: decoded._id,
                    //     }, config.privateKey, {
                    //         algorithm: 'RS256',
                    //         expiresIn: config.tokenMaxAge,
                    //     });

                    //     // Add the new token to the response headers
                    //     res.setHeader('new-token', jwtBearerToken);
                    // }

                    // API Route to get all tasks available to the ID passed in the parameter.
                    connectionPool.query(config.queries.allTasksAvailableToUserById, [decoded._id], (err, results) => {
                        if (err) {
                            console.log("Query Error: ", err);
                            return res.status(500).send({ message: 'Internal Server Error' });
                        }

                        // Check if our _task parameter matches any of the task returned by the query
                        const foundTask = results.find(_task => _task.id === task);
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
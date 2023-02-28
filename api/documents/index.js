const express = require('express');
const router = express.Router();
const config = require('../../config/development');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const auth = require('../../auth/');

const connectionPool = mysql.connectionPool;

/**
 * API Route to retrieve all users from the database as a JSON object
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * the pool.query method is a shrotcut since it handles the connection.release() for us, we
 * do not have to manually release the connection. https://github.com/mysqljs/mysql#pooling-connections
 */
router.get("/getDocuments", async (req, res) => {
    let conditions = '';
    let responseSent = false;

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        if (err || decoded == undefined) {
            responseSent = true;
            return res.status(500).send({ message: 'Bad Token' });
            
        }
        if (decoded !== undefined) {
            // API Route to get all tasks available to the ID passed in the parameter.
            connectionPool.query(config.queries.allTasksAvailableToUserById, [decoded._id], (err, results) => {
                if (err) {
                    console.log("Query Error: ", err);
                    responseSent = true;
                    return res.status(500).send({ message: 'Internal Server Error' });
                }

                // Now that we have the list of tasks the user has access to, let's build the query to get the documents the user has access to. 
                let firstItem = true;
                let querySnippet = 'docname = \''

                // WE NEED A CONDITION where user has access to nothing to return an empty array, otherwise it will do a 
                // pull of all from the database LOL

                for(let index = 0; index < config.documentationManuals.length; index ++){
                    const foundTask = results.find(task => task.id === config.documentationManuals[index].task_id);

                    if(foundTask){
                        if(firstItem){
                            conditions = conditions+' WHERE ';
                            firstItem = false;
                        } else {
                            conditions = conditions + ' OR '
                        }

                        conditions = conditions + querySnippet + config.documentationManuals[index].docname + '\'';
                    }
                }

                if (conditions == '') {
                    console.log("User does not have permission to view any documents");
                    responseSent = true;
                    return res.status(403).send({});
                }

                if(!responseSent){
                    connectionPool.query(config.queries.selectAllDocumentsQuery + conditions, (err, response) => {
                        if (err) {
                            console.log("Query Error: ", err);
                            responseSent = true;
                            return res.status(500).send({ message: 'Internal Server Error' });
                        }
                        console.log(response);
                        res.json(response);
                    });  
                }
            });
        }
    })
});

/**
 * API Route to send the config.docmanuals to the clientside
 * so we can create a drop-down based on that array.
 */
router.get("/getDocumentationManuals",async (req, res) => {
    res.json(config.documentationManuals);
});

module.exports = router;
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
router.get("/getDocuments",async (req, res) => {
    // now get a Promise wrapped instance of that connectionPool
    //console.log('logintoken:  ', req.headers.logintoken);
    let [response, buffer] = await connectionPool.promise().execute(config.queries.selectAllDocumentsQuery + ' ' + req.body.conditions);
	res.json(response);
});

module.exports = router;
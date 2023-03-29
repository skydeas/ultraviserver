'use strict';
/*eslint no-process-env:0*/
const fs = require("fs");
const nodemailer = require('nodemailer');

// Defined the database name here so we can use it in this file as well, If we need to change database Name.
const databaseName = 'ultravi_ulav';

// Production specific configuration
// =================================
module.exports = {
    // Private Key
    privateKey : fs.readFileSync('./assets/private.key'),
    // Public Key
    publicKey : fs.readFileSync('./assets/public.key'),
    // Name of the database we are using
    databaseName : databaseName,
    queries:  {
        selectAllUsersQuery : 'SELECT * FROM ' + databaseName + '.users',
        countUsersQuery : 'SELECT COUNT(id) as user_count FROM ' + databaseName + '.users',
        deleteUserQuery : 'DELETE FROM ' + databaseName + '.users WHERE id=?',
        addUserQuery : 'INSERT INTO ' + databaseName + '.users (username, password, salt, hint, location, airline, active, hr_employee, role, created, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?);',
        updateUserQuery : 'UPDATE  ' + databaseName + '.users SET username = ?, password = ?, salt = ?, hint = ?, location = ?, airline = ?, active = ?, hr_employee = ?, role = ?, created = ?, created_by = ? WHERE id = ?',
        // ====== Roles Table ======
        selectAllRolesQuery : 'SELECT * FROM ' + databaseName + '.roles',
        updateRoleQuery : 'UPDATE  ' + databaseName + '.roles SET name = ?, description = ?, created = ?, created_by = ? WHERE id = ?',
        addRoleQuery : 'INSERT INTO ' + databaseName + '.roles (name, description, created, created_by) VALUES (?,?,?,?);',
        // ====== Tasks Table ======
        selectAllTasksQuery : 'SELECT * FROM ' + databaseName + '.tasks',
        updateTaskQuery : 'UPDATE  ' + databaseName + '.tasks SET description = ? WHERE id = ?',
        addTaskQuery : 'INSERT INTO ' + databaseName + '.tasks (description) VALUES (?);',
        // ====== Role-Tasks Table ======
        selectAllRolesTasksQuery : 'SELECT * FROM ' + databaseName + '.roles_tasks',
        selectAllRolesTasksByIdQuery : 'SELECT * FROM ' + databaseName + '.roles_tasks WHERE role_id=?',
        // ====== User-Roles Table ======
        selectUserRolesById : 'SELECT * FROM ' + databaseName + '.users_roles WHERE user_id=?',
        // ====== Authentication Queries ======
        allTasksAvailableToUserById : 'SELECT tasks.* FROM tasks JOIN roles_tasks ON tasks.id = roles_tasks.task_id JOIN roles ON roles_tasks.role_id = roles.id JOIN users_roles ON roles.id = users_roles.role_id JOIN users ON users_roles.user_id = users.id WHERE users.id =?;',
        // ====== Documents Table ======
        selectAllDocumentsQuery : 'SELECT * FROM ' + databaseName + '.documents',
        addDocumentQuery : 'INSERT INTO ' + databaseName + '.documents (seq, docname, pnom, title, ver, active, effective, updated) VALUES (?,?,?,?,?,?,?,?);',
        updateSequenceQuery : 'UPDATE ' + databaseName + '.documents SET seq=? WHERE id=?',
        updateDocumentQuery : 'UPDATE ' + databaseName + '.documents SET docname=?,pnom=?,title=?,ver=?,active=?,effective=?,updated=? WHERE id=?',
        updateDocumentActiveStatusQuery : 'UPDATE ' + databaseName + '.documents SET active=? WHERE id=?',
        // ====== Airports Table ======
        selectAllAirportsQuery : 'SELECT * FROM ' + databaseName + '.airports',
        addAirportQuery : 'INSERT INTO ' + databaseName + '.airports (IATA, ICAO, AirportName, City, Country, Latitude, Longitude, Altitude, TZ) VALUES (?,?,?,?,?,?,?,?,?);',
        updateAirportQuery : 'UPDATE ' + databaseName + '.airports SET IATA=?,ICAO=?,AirportName=?,City=?,Country=?,Latitude=?,Longitude=?,Altitude=?,TZ=? WHERE id=?',
        deleteAirportQuery : 'DELETE FROM ' + databaseName + '.airports WHERE id=?',
        // ====== Password Resert Tokens Table ======
        selectAllPasswordResetTokensQuery : 'SELECT * FROM ' + databaseName + '.account_recovery_tokens',
        addPasswordResetTokenQuery : 'INSERT INTO ' + databaseName + '.account_recovery_tokens (expiration, user_email) VALUES (?,?);',
        deletePasswordResetTokenQuery : 'DELETE FROM ' + databaseName + '.account_recovery_tokens WHERE id=?',


    },
    tokenMaxAge: ('2h'), // 2 hours
    // Array of objects for the manuals (different sections) in our database. If needed we can make this a database object.
    documentationManuals: [
        {categoryName: "Employee Handbook", docname: "EH", task_id: 11},
        {categoryName: "General Operations Manual", docname: "GOM", task_id: 12},
        {categoryName: "General Operations Manual Forms", docname: "GOMF", task_id: 13},
        {categoryName: "Dangerous Goods Regulations", docname: "DGR", task_id: 14},
        {categoryName: "Airport Manuals & Guides", docname: "KMANUALS", task_id: 15},
        {categoryName: "Safety Bulletins", docname: "SFTB", task_id: 16},
    ],
    mail_transporter : nodemailer.createTransport({
        host: 'mail.ultravi.com',
        port: 465,
        secure: true,
        auth: {
            user: 'mdambrosio@ultravi.com',
            pass: 'tmw5*lvcd.vi'
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 20000
    })
};


/*
// Server IP
ip: process.env.OPENSHIFT_NODEJS_IP
    || process.env.ip
    || undefined,

// Server port
port: process.env.OPENSHIFT_NODEJS_PORT
    || process.env.PORT
    || 8080,

// MongoDB connection options
mongo: {
    useMongoClient: true,
    uri: process.env.MONGODB_URI
        || process.env.MONGOHQ_URL
        || process.env.OPENSHIFT_MONGODB_DB_URL + process.env.OPENSHIFT_APP_NAME
        || 'mongodb://localhost/trailcrew-dev'
},
*/
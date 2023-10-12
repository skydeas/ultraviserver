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
        // ====== User Table ======
        selectAllUsersQuery : 'SELECT * FROM ' + databaseName + '.users',
        countUsersQuery : 'SELECT COUNT(id) as user_count FROM ' + databaseName + '.users',
        deleteUserQuery : 'DELETE FROM ' + databaseName + '.users WHERE id=?',
        addUserQuery : 'INSERT INTO ' + databaseName + '.users (username, password, salt, hint, location, airline, active, hr_employee, role, created, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?);',
        updateUserQuery : 'UPDATE  ' + databaseName + '.users SET username = ?, password = ?, salt = ?, hint = ?, location = ?, airline = ?, active = ?, hr_employee = ?, role = ?, created = ?, created_by = ? WHERE id = ?',
        updateUserPasswordByEmailQuery : 'UPDATE  ' + databaseName + '.users SET password = ? WHERE email = ?',
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
        // ====== Airlines Table ======
        selectAllAirlinesQuery : 'SELECT * FROM ' + databaseName + '.airlines',
        addAirlineQuery : 'INSERT INTO ' + databaseName + '.airlines (name, code) VALUES (?,?);',
        updateAirlineQuery : 'UPDATE ' + databaseName + '.airlines SET name=?,code=? WHERE id=?',
        deleteAirlineQuery : 'DELETE FROM ' + databaseName + '.airlines WHERE id=?',
        // ====== Aircrafts Table ======
        selectAllAircraftsQuery : 'SELECT * FROM ' + databaseName + '.aircrafts',
        addAircraftQuery : 'INSERT INTO ' + databaseName + '.aircrafts (ac_type, ac_reg, airline) VALUES (?,?,?);',
        updateAircraftQuery : 'UPDATE ' + databaseName + '.aircrafts SET ac_type=?,ac_reg=?,airline=? WHERE id=?',
        deleteAircraftQuery : 'DELETE FROM ' + databaseName + '.aircrafts WHERE id=?',
        // ====== Clients Table ======
        selectAllClientsQuery : 'SELECT * FROM ' + databaseName + '.clients',
        addClientQuery : 'INSERT INTO ' + databaseName + '.clients (shortName, legalName, type, address, city, state, zip, country) VALUES (?,?,?,?,?,?,?,?);',
        updateClientQuery : 'UPDATE ' + databaseName + '.clients SET shortName=?,legalName=?,type=?,address=?,city=?,state=?,zip=?,country=? WHERE id=?',
        deleteClientQuery : 'DELETE FROM ' + databaseName + '.clients WHERE id=?',
        // ac type
        selectAllAc_typesQuery: 'SELECT * FROM ' + databaseName + '.ac_type ORDER BY name;',
        // ====== Password Resert Tokens Table ======
        selectAllPasswordResetTokensQuery : 'SELECT * FROM ' + databaseName + '.account_recovery_tokens',
        addPasswordResetTokenQuery : 'INSERT INTO ' + databaseName + '.account_recovery_tokens (expiration, user_email) VALUES (?,?);',
        deletePasswordResetTokenQuery : 'DELETE FROM ' + databaseName + '.account_recovery_tokens WHERE id=?',
        deletePasswordResetTokenByEmailQuery : 'DELETE FROM ' + databaseName + '.account_recovery_tokens WHERE email=?',
        // ====== Flight Schedule Rules Table ======
        selectAllFlightScheduleRulesQuery : 'SELECT * FROM ' + databaseName + '.flight_schedule_rules',
        createFlightScheduleRuleQuery: 'INSERT INTO ' + databaseName + '.flight_schedule_rules (recurring, date_start, date_end, airline, client, remarks, flight_number, flight_number_out, scheduled_arrival_time, scheduled_departure_time, arrival_city, departure_city, monday, tuesday, wednesday, thursday, friday, saturday, sunday, ac_type, sta_offset) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);',
        updateFlightScheduleRuleQuery: `UPDATE ${databaseName}.flight_schedule_rules SET recurring = ?, date_start = ?, date_end = ?, airline = ?, client = ?, remarks = ?, flight_number = ?, flight_number_out = ?, scheduled_arrival_time = ?, scheduled_departure_time = ?, arrival_city = ?, departure_city = ?, monday = ?, tuesday = ?, wednesday = ?, thursday = ?, friday = ?, saturday = ?, sunday = ?, ac_type = ?, sta_offset = ?, next_leg_pointer =? WHERE id = ?;`,
        // ====== Flight Activity / Buffer Rules Table ======
        updateFlightActivityLegQuery : 'UPDATE ' + databaseName + '.flight_schedule_activity SET ac_type=?, actual_arrival_time=?, actual_departure_time=?, ac_reg=?, airline=?, arrival_city=?, client=?, date=?, departure_city=?, estimated_arrival_time=?, estimated_departure_time=?, flight_number=?, gate=?, next_leg_pointer=?, pax=?, remarks=?, scheduled_arrival_time=?, scheduled_departure_time=?, wheelchair_count=? WHERE id=?',
        updateFlightBufferLegQuery : 'UPDATE ' + databaseName + '.flight_schedule_buffer SET ac_type=?, actual_arrival_time=?, actual_departure_time=?, ac_reg=?, airline=?, arrival_city=?, client=?, date=?, departure_city=?, estimated_arrival_time=?, estimated_departure_time=?, flight_number=?, gate=?, next_leg_pointer=?, pax=?, remarks=?, scheduled_arrival_time=?, scheduled_departure_time=?, wheelchair_count=? WHERE id=?',

        // NOT BEING USED getFlightActivityDeparturesQuery: 'SELECT * FROM ' + databaseName + '.flight_schedule_rules WHERE ? BETWEEN date_start AND date_end AND ? = true AND departure_city = ?;',

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
            user: 'do-not-reply@ultravi.com',
            pass: 'NvM1\'86A£&£;'
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 20000
    }),
    mailerName: 'do-not-reply@ultravi.com',
    // Day length of flight activity
    flightActivityLength: 2,
    // Day length of flight buffer
    flightBufferLength: 14
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
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
        selectAllflightCoordinatorsQuery: 'SELECT * FROM ' + databaseName + '.flight_coordinators;',
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
        selectAllRolesTasksByIdQuery : 'SELECT * FROM ' + databaseName + '.roles_tasks WHERE role=?',
        // ====== User-Roles Table ======
        selectUserRolesById : 'SELECT * FROM ' + databaseName + '.users_roles WHERE user=?',
        // ====== Authentication Queries ======
        allTasksAvailableToUserById : 'SELECT tasks.* FROM tasks JOIN roles_tasks ON tasks.id = roles_tasks.task JOIN roles ON roles_tasks.role = roles.id JOIN users_roles ON roles.id = users_roles.role JOIN users ON users_roles.user = users.id WHERE users.id =?;',
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
        selectAllAc_typesQuery: 'SELECT * FROM ' + databaseName + '.ac_types ORDER BY name;',
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
        deleteFlightActivityLegQuery: 'DELETE FROM ' + databaseName + '.flight_schedule_activity WHERE id=?',
        updateTrcValueOnFlightActivity : 'UPDATE ' + databaseName + '.flight_schedule_activity SET flight_coordinator=? WHERE id=?',
        // ====== Additional Services Table ======
        selectAllAdditionalServices : 'SELECT * FROM ' + databaseName + '.additional_services',
        selectAllAdditionalServicesWithFilter: `SELECT 
                s.id, s.client, s.airline, s.service, s.date, s.timeStart, s.timeEnd, s.flightId, s.remarks, s.equipmentId, s.isComplete, s.locationStart, s.locationEnd, s.quantity, a.flight_number 
            FROM 
                ${databaseName}.additional_services s 
            LEFT JOIN 
                ultravi_ulav.flight_schedule_activity a ON s.flightId = a.id 
            WHERE 
        s.date BETWEEN ? AND ?`,
        addAdditionalService : 'INSERT INTO ' + databaseName + '.additional_services (client, airline, service, date, timeStart, timeEnd, flightId, remarks, equipmentId, isComplete, locationStart, locationEnd, quantity) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?);',
        updateAdditionalService: 'UPDATE ' + databaseName + '.additional_services SET client=?, airline=?, service=?, date=?, timeStart=?, timeEnd=?, flightId=?, remarks=?, equipmentId=?, isComplete=?, locationStart=?, locationEnd=?, quantity=? WHERE id=?',
        deleteAdditionalService: 'DELETE FROM ' + databaseName + '.additional_services WHERE id=?',
        deleteAdditionalServiceByFlightId: 'DELETE FROM ' + databaseName + '.additional_services WHERE flightId=?',
        // ====== Services Table ======
        selectAllServices : 'SELECT * FROM ' + databaseName + '.services ORDER BY name',
        // ====== Delays Table ======
        deleteDelayByFlightId: 'DELETE FROM ' + databaseName + '.flight_schedule_delays WHERE leg_id=?',
        deleteDelay: 'DELETE FROM ' + databaseName + '.flight_schedule_delays WHERE id=?',
        createDelay: 'INSERT INTO ' + databaseName + '.flight_schedule_delays (leg_id, min, code, at_fault, remarks) VALUES (?,?,?,?,?);',
        updateDelay: 'UPDATE ' + databaseName + '.flight_schedule_delays SET leg_id=?, min=?, code=?, at_fault=?, remarks=? WHERE id=?;',
        selectAllDelaysWithFilter : 'SELECT * FROM ' + databaseName + '.flight_schedule_delays', //  WHERE date BETWEEN ? AND ?
        // ====== FIS Table =======
        createFis: 'INSERT INTO ' + databaseName + '.fis (facility, airlineId, ac_Type, body_type, flight_number, scheduled_arrival_time, block_time, first_priority, last_priority, first_bag, last_bag, carrousel, remarks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        updateFis: 'UPDATE ' + databaseName + '.fis SET facility=?, airlineId=?, ac_Type=?, body_type=?, flight_number=?, scheduled_arrival_time=?, block_time=?, first_priority=?, last_priority=?, first_bag=?, last_bag=?, carrousel=?, remarks=? WHERE id = ?',
        getFisById: 'SELECT * FROM ' + databaseName + '.fis WHERE id = ?',
        deleteFisById: 'DELETE FROM ' + databaseName + '.fis WHERE id = ?',
        // ====== TRC Table =======
        getAllTrc: 'SELECT * FROM ' + databaseName + '.trc;',
        getTrcByFlightId: 'SELECT * FROM ' + databaseName + '.trc WHERE flightId=?',
        createTrc: 'INSERT INTO ' + databaseName + '.trc (cabinCrewArrivalTime, cateringEquipmentProcedureFollowed, cateringOnloadTime, cateringOffloadTime, fuelingSafetyProcedureFollowed, fuelingUplift, fuelingTicket, toiletService, waterService, remarks, flightId) VALUES (?,?,?,?,?,?,?,?,?,?,?);',
        updateTrc: 'UPDATE ' + databaseName + '.trc SET cabinCrewArrivalTime=?, cateringEquipmentProcedureFollowed=?, cateringOnloadTime=?, cateringOffloadTime=?, fuelingSafetyProcedureFollowed=?, fuelingUplift=?, fuelingTicket=?, toiletService=?, waterService=?, remarks=? WHERE flightId=?',
        // ====== Pax Table =======
        getAllPax: 'SELECT * FROM ' + databaseName + '.pax;',
        // ====== Ramp Table =======a
        getAllRamp: 'SELECT * FROM ' + databaseName + '.ramp;',
        // ====== Cabin Table =======
        getAllCabin: 'SELECT * FROM ' + databaseName + '.cabin;',
        // ====== Security Table =======
        getAllSecurity: 'SELECT * FROM ' + databaseName + '.security;',        
        // NOT BEING USED getFlightActivityDeparturesQuery: 'SELECT * FROM ' + databaseName + '.flight_schedule_rules WHERE ? BETWEEN date_start AND date_end AND ? = true AND departure_city = ?;',
        // ====== Baggage Table =======
        getAllBaggage: 'SELECT * FROM ' + databaseName + '.baggage;',
        getBaggageByFlightId: 'SELECT * FROM ' + databaseName + '.baggage WHERE flightId=?',
        createBaggage: 'INSERT INTO ' + databaseName + '.baggage (lob, rush, pax, bagRoom, ramp, carryOn, oversize, gate, remarks, flightId) VALUES (?,?,?,?,?,?,?,?,?,?);',
        updateBaggage: 'UPDATE ' + databaseName + '.baggage SET lob=?, rush=?, pax=?, bagRoom=?, ramp=?, carryOn=?, oversize=?, gate=?, remarks=? WHERE flightId=?',

    },
    tokenMaxAge: ('2h'), // 2 hours
    facilities: 
    [
        {'name': 'D', id: 1},
        {'name': 'E', id: 2},
        {'name': 'J', id: 3},
    ],
    aircraftBodyTypes: 
    [
        {'name': 'Wide', id: 1},
        {'name': 'Narrow', id: 2},
    ],
    // Array of objects for the manuals (different sections) in our database. If needed we can make this a database object.
    documentationManuals: [
        {categoryName: "Employee Handbook", docname: "EH", task: 11},
        {categoryName: "General Operations Manual", docname: "GOM", task: 12},
        {categoryName: "General Operations Manual Forms", docname: "GOMF", task: 13},
        {categoryName: "Dangerous Goods Regulations", docname: "DGR", task: 14},
        {categoryName: "Airport Manuals & Guides", docname: "KMANUALS", task: 15},
        {categoryName: "Safety Bulletins", docname: "SFTB", task: 16},
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
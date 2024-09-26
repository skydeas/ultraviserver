const express = require('express');
const router = express.Router();
const config = require('../../config/development');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const auth = require('../../auth');
const multer = require('multer')
const moment = require('moment');
const logger = require('../../logger');

//#region  ============================= Middlewares ==========================
let POVCity = 'MIA';
//#endregion

const connectionPool = mysql.connectionPool;

/**
 * Route that creates a operational hazard form
 */
router.post("/createOpHazardForm", auth.authenticateRequest(57), multer().none(), async (req, res) => {
    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
    jwt.verify(req.headers.logintoken, config.privateKey, (err, decoded) => {
        // If there is a bad token, reject the request.
        if (err || decoded == undefined) {
            return res.status(500).send({ message: 'Bad Token' });
            
        }

        connectionPool.query(config.queries.createOpHazardForm, [
            req.body.name !== 'null' && req.body.name !== '' ? req.body.name : null,
            req.body.employeeId !== 'null' && req.body.employeeId !== '' ? req.body.employeeId : null,
            req.body.date !== 'null' && req.body.date !== '' ? moment(req.body.date).unix() : null,
            req.body.department !== 'null' && req.body.department !== '' ? req.body.department : null,
            req.body.area !== 'null' && req.body.area !== '' ? req.body.area : null,
            req.body.hazardCount !== 'null' && req.body.hazardCount !== '' ? req.body.hazardCount : null,
            req.body.hazardTypeGroundEquipmentBoolean !== 'null' && req.body.hazardTypeGroundEquipmentBoolean !== '' ? req.body.hazardTypeGroundEquipmentBoolean : null,
            req.body.hazardTypeHumanFactorBoolean !== 'null' && req.body.hazardTypeHumanFactorBoolean !== '' ? req.body.hazardTypeHumanFactorBoolean : null,
            req.body.hazardTypeFacilityConditionsBoolean !== 'null' && req.body.hazardTypeFacilityConditionsBoolean !== '' ? req.body.hazardTypeFacilityConditionsBoolean : null,
            req.body.hazardTypeEnvironmentConditionsBoolean !== 'null' && req.body.hazardTypeEnvironmentConditionsBoolean !== '' ? req.body.hazardTypeEnvironmentConditionsBoolean : null,
            req.body.hazardTypeOtherBoolean !== 'null' && req.body.hazardTypeOtherBoolean !== '' ? req.body.hazardTypeOtherBoolean : null,
            req.body.describeUndesiredRemarks !== 'null' && req.body.describeUndesiredRemarks !== '' ? req.body.describeUndesiredRemarks : null,
            req.body.reccommendationsRemarks !== 'null' && req.body.reccommendationsRemarks !== '' ? req.body.reccommendationsRemarks : null,
            req.body.additionalCommentsRemarks !== 'null' && req.body.additionalCommentsRemarks !== '' ? req.body.additionalCommentsRemarks : null,
            req.body.lackOfEquipmentBoolean !== 'null' && req.body.lackOfEquipmentBoolean !== '' ? req.body.lackOfEquipmentBoolean : null,
            req.body.innapropriateProtectiveEquipmentBoolean !== 'null' && req.body.innapropriateProtectiveEquipmentBoolean !== '' ? req.body.innapropriateProtectiveEquipmentBoolean : null,
            req.body.groundEquipmentOtherBoolean !== 'null' && req.body.groundEquipmentOtherBoolean !== '' ? req.body.groundEquipmentOtherBoolean : null,
            req.body.groundEquipmentIdNumber !== 'null' && req.body.groundEquipmentIdNumber !== '' ? req.body.groundEquipmentIdNumber : null,
            req.body.lackOfPersonnelBoolean !== 'null' && req.body.lackOfPersonnelBoolean !== '' ? req.body.lackOfPersonnelBoolean : null,
            req.body.scheduleOverloadedBoolean !== 'null' && req.body.scheduleOverloadedBoolean !== '' ? req.body.scheduleOverloadedBoolean : null,
            req.body.RudenessOfCoworkerBoolean !== 'null' && req.body.RudenessOfCoworkerBoolean !== '' ? req.body.RudenessOfCoworkerBoolean : null,
            req.body.humanFactorOtherBoolean !== 'null' && req.body.humanFactorOtherBoolean !== '' ? req.body.humanFactorOtherBoolean : null
        ], (err, response) => {
            if (err) {
                console.log("Query Error: ", err);
                return res.status(500).send({ message: 'Internal Server Error' });
            }

            // Log that a user has created a rule:
            const dataToAppend = { action: 'Created Op Hazard Form', username: decoded._username, id: decoded._id, timestamp: moment().unix(), readableTimestamp:moment.unix(Date.now() / 1000).format('YYYY-MM-DD HH:mm:ss'), response: response, opHazardForm: req.body};
            const arrayName = 'safety'; // Name of the array in the JSON file

            logger.writeToLogFile(dataToAppend, arrayName);

            res.status(200).send({message: 'success', response: response});
        }); 
    })
});

module.exports = router;
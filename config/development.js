'use strict';
/*eslint no-process-env:0*/
const fs = require("fs");

// Production specific configuration
// =================================
module.exports = {
    // Private Key
    privateKey : fs.readFileSync('./assets/private.key'),
    // Public Key
    publicKey : fs.readFileSync('./assets/public.key'),
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
    tokenMaxAge: ('2h') // 2 hours
};
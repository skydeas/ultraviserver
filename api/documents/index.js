const express = require('express');
const router = express.Router();
const config = require('../../config/development');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const auth = require('../../auth/');
const fs = require('fs');
const path = require('path');


//#region ================== MULTER CONFIG ========================
const multer  = require('multer')

// Define storage for temporary file upload
const tempStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './temp/');
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    }
});
// Define multer middleware for temporary file upload
const tempUpload = multer({ storage: tempStorage });
  
// configure multer middleware to store files in a directory called "uploads"
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log('MiddleWare Destination: ' + req.body.formDocname);
        cb(null, 'assets/documentation/' + req.body.formDocname);
    },
    filename: (req, file, cb) => {
        console.log('MiddleWare Filename: ' + req.body.formFilename);
        cb(null, req.body.formFilename + '.pdf');
    },
}); 
// Define multer middleware for permanent file upload
const  upload = multer({ storage: storage });
//#endregion ================== MULTER CONFIG ========================

//#region  ============================= Middlewares ==========================

const requestTime = function (req, res, next) {
    console.log('LMAO ERROR')
    req.requestTime = Date.now()
    // return res.status(500).send({ message: 'Internal Server Error' });
    next();
}

// Middleware function to ensure filename does not contain spaces nor any '.pdf'
const sanitizeData = function (req, res, next) {
    // This code will be redone later down the line in case the user changes the input.
    console.log('Inside sanitize', req.body);
    req.body.formFilename = 'this is my filename spaces aaaaa .pdf'
    let newFilename = req.body.formFilename;
    newFilename = newFilename.replace(/\s+/g, '_'); // replace spaces with underscores
    newFilename = newFilename.replace(/\.pdf/g, ''); // remove any instance of '.pdf' from the filename
    req.body.formFilename = newFilename;

    next();
}

//#endregion


const connectionPool = mysql.connectionPool;

/**
 * API Route to retrieve the documents from the database as a JSON object the user has acces to
 * Asynchronously handles the query to the database thanks to using the connection pool,
 * It returns the documents the user has access to. 
 * 1. veirfy JWT and store user_id
 * 2. get tasks available to by user_id
 * 3. create document query based on those tasks using config.docmanuals
 * 4. return either a 403 if no docs, or the docs the user has access to
 * ==== change ====
 * Response is now going to be two items, the docmanuals filtered, and the results from the db, in the same JSON
 * Will change the front end to consume this effectively.
 */
router.get("/getDocuments", async (req, res) => {
    let conditions = '';
    let responseSent = false;
    let filteredDocManuals = [];

    // Check if the user is logged in, and if his token is valid, If so, find all tasks they have access    to
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
                        filteredDocManuals.push(config.documentationManuals[index]);
                        if(firstItem){
                            conditions = conditions+' WHERE ';
                            firstItem = false;
                        } else {
                            conditions = conditions + ' OR '
                        }

                        conditions = conditions + querySnippet + config.documentationManuals[index].docname + '\'';
                    }
                }

                // If there are no conditions after the previous for, return nothing, as otherwise the query would go through and get ALL of the documents.
                if (conditions == '') {
                    console.log("User does not have permission to view any documents");
                    responseSent = true;
                    return res.status(403).send({});
                }

                // Appending ORDER BY seq at the end of the query to order by squence to see if it works
                // Check if a response was sent, and if not, return the correct data 
                if(!responseSent){
                    connectionPool.query(config.queries.selectAllDocumentsQuery + conditions + "ORDER BY seq", (err, response) => {
                        if (err) {
                            console.log("Query Error: ", err);
                            responseSent = true;
                            return res.status(500).send({ message: 'Internal Server Error' });
                        }
                        // console.log(response);
                        res.json({'filteredDocumentation': response, 'filteredDocumentationManuals': filteredDocManuals});
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

/**
 * API Route to send the document back to the user.
 */
router.get("/requestFile/:docname/:pnom",async (req, res) => {
    /*
    let filePath = '/assets/documentation/';
    filePath = filePath + req.params.docname + '/' + req.params.pnom;
    */

    let filePath = path.join(__dirname, '../../assets/documentation/' + req.params.docname + '/' + req.params.pnom);
    // console.log(req.params.docname + '/' + req.params.pnom);
    // res.sendFile(filePath, { root: '.' });

    // Set the response headers to indicate that the content should be treated as an attachment
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=' + req.params.pnom);

    // Read the PDF file from disk and stream it to the response
    const fileStream = fs.createReadStream(filePath, { root: __dirname });
    fileStream.pipe(res);
});

/**
 * API Route to upload documents to our Directories as well as server.
 * using multer's upload we defined above as our middleware.
 */
router.post("/addDocument", async (req, res) => {
    // Use tmpUpload middleware to save file to temporary location
    tempUpload.single("myFile")(req, res, function (err) {
        console.log('tempUpload');
        if (err) {
        // Handle error
        console.error(err);
        return res.status(500).send('Error uploading file');
        }

        // Use editFormFilename middleware to edit req.body.formFilename
        sanitizeData(req, res, function () {
            console.log('sanitizeData');
            console.log('Inside sanitize Data: reqbody', req.body);
            console.log('./assets/documentation/' + req.body.formDocname + '/' + req.body.formFilename + '.pdf');
            fs.copyFile('./temp/' + req.file.filename, './assets/documentation/' + req.body.formDocname + '/' + req.body.formFilename + '.pdf', (err) => {
                if (err) {
                  console.log(err);
                  return res.status(500).send('Error uploading file');
                }
                console.log('inside copyFile');
                // Delete temporary file
                fs.unlinkSync('./temp/' + req.file.filename);
            
                res.json({'a': 'b'})
              });
        });
    });
    /*
    console.log(req.requestTime);
    // retrieve the form data from the request body
    const formData = req.body;
    console.log('Main Call v')
    console.log(req.body)
    */
    // do something with the form data and file
    // console.log(formData.get('file'));
    // console.log(formData.get('myFile'));
    // console.log(formData);


    // console.log(JSON.stringify(formData.formEffective, null, 4));

    /*
    connectionPool.query(config.queries.addDocumentQuery, 
        [
            0, // Seq
            formData.docname,
            formData.pnom + '.pdf',
            formData.title,
            1, // active
            formData.effective,
            Date.now() // Updated, which is right now, in epoch.
        ], (err, response) => {
        if (err) {
            console.log("Query Error: ", err);
            return res.status(500).send({ message: 'Internal Server Error' });
        }
        console.log("File added successfully");
        res.json(response);
    });  
    */
   // res.json({'a': 'b'})
});


/**
 * Route to check if our database has an entry that matches the passed 
 * parameter for docname and pnom (manual / filename)
 * returns TRUE if the filename is taken, FALSE if it's available to be used.
 */
router.post("/isFilenameTaken", async (req, res) => {

    // Putting the query here for now, we might move it to the config file later
    let query = `SELECT EXISTS(SELECT 1 FROM documents WHERE docname = '${req.body.docname}' AND pnom = '${req.body.pnom}.pdf') AS entry_exists;`

    console.log(query);

    connectionPool.query(query, (err, [response, buffer]) => {
        if (err) {
            console.log("Query Error: ", err);
            return res.status(500).send({ message: 'Internal Server Error' });
        }
        console.log("response: " + response.entry_exists);
        res.json(response);
    });  
});

module.exports = router;
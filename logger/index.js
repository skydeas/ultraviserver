const fs = require('fs');
const path = require('path');
const moment = require('moment');

class WriteQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  enqueue(operation) {
    this.queue.push(operation);
    this.processQueue();
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    const operation = this.queue.shift();
    try {
      await operation();
    } catch (error) {
      console.error('Error writing to file:', error);
    }

    this.processing = false;
    this.processQueue();
  }
}

const writeQueue = new WriteQueue();

// Usage
async function writeToLogFile(data, arrayName) {
  const operation = async () => {
    const fullPath = path.resolve('logs/' + getFileName());

    try {
      // Initialize the array if it doesn't exist
      let logData = {};
      
      // Check if the file exists
      if (fs.existsSync(fullPath)) {
        // Read existing content from the file
        const existingContent = await fs.promises.readFile(fullPath, 'utf8');
        logData = JSON.parse(existingContent);
      }

      if (!logData[arrayName]) {
        logData[arrayName] = [];
      }

      // Append data to the specified array
      logData[arrayName].push(data);

      // Write updated content back to the file
      await fs.promises.writeFile(fullPath, JSON.stringify(logData, null, 2));

      console.log('Data appended to array:', arrayName);
    } catch (error) {
      console.error('Error writing to file:', error);
    }
  };

  writeQueue.enqueue(operation);
}

function getFileName(){
    let fileName = moment().format('YYYY-MM-DD') + '.json';
    return fileName;
}

  
module.exports = {
writeQueue,
writeToLogFile,
getFileName,
};
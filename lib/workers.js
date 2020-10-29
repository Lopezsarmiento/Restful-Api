/*
* Worker-related tasks
*
*/

// Dependencies
const path = require('path');
const fs = require('fs');
const _data = require('./data');
const https = require('https');
const http = require('http');
const helpers = require('./helpers');
const url = require('url');
const _logs = require('./logs');

// instantiate worker object
const workers = {};

// Lookup all checks, get their data and send to a validator
workers.gatherAllChecks = () => {
  // get all checks
  console.log('Getting checks');
  _data.list('checks', (err, checks) => {
    if (err || checks.length <= 0) {
      console.log('Error: Could not find any checks to process');
      return;
    }

    if (!err && checks && checks.length > 0) {
      checks.forEach((check) => {
        // Read in the check data
        _data.read('checks', check, (err, originalCheckdata) => {
           if (err) {
             console.log('Error reading check data');
             return;
           }

           if (!err && originalCheckdata) {
             // Pass it to a check validator
             workers.validateCheckdata(originalCheckdata);
           }

        });
      });
    }


  });
}

// Sanity-check the checkdata
workers.validateCheckdata = (originalCheckdata) => {
  console.log('check orig data: ', originalCheckdata)
  originalCheckdata = typeof(originalCheckdata) === 'object' && originalCheckdata != null ? originalCheckdata : {};
  originalCheckdata.id = typeof(originalCheckdata.id) === 'string' && originalCheckdata.id.trim().length === 20 ? originalCheckdata.id.trim() : false;

  originalCheckdata.userPhone = typeof(originalCheckdata.userPhone) === 'string' && originalCheckdata.userPhone.trim().length === 10 ? originalCheckdata.userPhone.trim() : false;

  originalCheckdata.protocol = typeof(originalCheckdata.protocol) === 'string' && ['http', 'https'].indexOf(originalCheckdata.protocol) > -1 ? originalCheckdata.protocol: false;

  originalCheckdata.url = typeof(originalCheckdata.url) === 'string' && originalCheckdata.url.trim().length > 0 ? originalCheckdata.url.trim() : false;

  originalCheckdata.method = typeof(originalCheckdata.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckdata.method) > -1 ? originalCheckdata.method: false;

  originalCheckdata.successcodes = typeof originalCheckdata.successcodes === "object" && originalCheckdata.successcodes instanceof Array && originalCheckdata.successcodes.length > 0 ? originalCheckdata.successcodes : false;
  
  originalCheckdata.timeoutseconds = typeof(originalCheckdata.timeoutseconds) === "number" && originalCheckdata.timeoutseconds % 1 === 0 && originalCheckdata.timeoutseconds >= 1 && originalCheckdata.timeoutseconds <= 5 ? originalCheckdata.timeoutseconds : false;

  // Set keys that may not be set before
  originalCheckdata.state = typeof(originalCheckdata.state) == 'string' && ['up', 'down'].indexOf(originalCheckdata.state) > -1 ? originalCheckdata.state : 'down'; 

  originalCheckdata.lastChecked = typeof originalCheckdata.lastChecked === "number" && originalCheckdata.lastChecked > 0 ? originalCheckdata.lastChecked : false;

  // validation
  const  {id, userPhone, protocol, method, url, successcodes, timeoutseconds} = originalCheckdata;
  if ( !id || !userPhone || !protocol || !method || !url || !successcodes || !timeoutseconds) {
    console.log('Error: one of the checks is not properly formatted. skipping it.');
    return;
  }

  // perform check
  workers.performCheck(originalCheckdata);
}

// Perform url check
// send originaldata 
// and outcome of the process
workers.performCheck = (originalCheckdata) => {
  // Prepare initial check outcome
  const checkOutcome = {
    'error': false,
    'responseCode': false
  };

  // Mark that the outcome has not been sent yet.
  let outcomeSent = false;

  // Parse hostname nad path
  const parsedurl = url.parse(`${originalCheckdata.protocol}://${originalCheckdata.url}`, true);
  const hostname = parsedurl.hostname;
  const path = parsedurl.path; // using path instead of pathname as we want the query string;

  // construc the req
  const requestDetails = {
    'protocol': `${originalCheckdata.protocol}:`,
    'hostname': hostname,
    'method': originalCheckdata.method.toUpperCase(),
    'path': path,
    'timeout': originalCheckdata.timeoutseconds * 1000
  };

  // instantiate the req object
  const _moduleToUse = originalCheckdata.protocol === 'http' ? http:https;
  const req = _moduleToUse.request(requestDetails, (res) => {
    // Get status of the req
    console.log('response status code: ',res.statusCode);
    // update checkOutcome and pass data along
    checkOutcome.responseCode = res.statusCode;
    if (!outcomeSent) {
      workers.processCheckoutOutcome(originalCheckdata, checkOutcome);
      outcomeSent = true;
    }
  });


  // Bind to the event error so it doesnt get thrown.
  req.on('error', (err) => {
    // update checkOutcome and pass data along
    checkOutcome.error = {
      'error': true,
      'value': err
    }

    if (!outcomeSent) {
      workers.processCheckoutOutcome(originalCheckdata, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to timeout
  req.on('timeout', (err) => {
    // update checkOutcome and pass data along
    checkOutcome.error = {
      'error': true,
      'value': 'timeout'
    }

    if (!outcomeSent) {
      workers.processCheckoutOutcome(originalCheckdata, checkOutcome);
      outcomeSent = true;
    }
  });

  // End/Send request
  req.end();

}

// Process check outcome, update check data as needed, trigger alert
workers.processCheckoutOutcome = (originalCheckdata, checkOutcome) => {
  // verify if check is up or down
  const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckdata.successcodes.indexOf(checkOutcome.responseCode) > -1 ? 'up':'down';

  // decide if alert is required
  const alertWarranted = originalCheckdata.lastChecked && originalCheckdata.state !== state ? true:false;

  // log check outcome
  const checktime = Date.now();
  workers.log(originalCheckdata,checkOutcome,state,alertWarranted,checktime);

  // update check data
  const newCheckData = originalCheckdata;
  newCheckData.state = state;
  newCheckData.lastChecked = checktime;

  // Save updates
  _data.update('checks', newCheckData.id, newCheckData, (err) => {
    if (err) {
      console.log('Error trying to save udpates to check table.')
      return;
    }

    if (!alertWarranted) {
      console.log('Check outcome has not changed. No alert needed.');
      return;
    }

    workers.alertUsers(newCheckData);
  });
}

// Alert the user
workers.alertUsers = (newCheckData) => {
  const  {method, url, protocol, state} = newCheckData;
  const msg = `Alert: Your check for ${method.toUpperCase()} ${protocol}://${url} is currently ${state}`;

  // send message
  helpers.sendTwilioSms(newCheckData.userPhone, msg, (err)=> {
    if (err) {
      console.log('Error: Could not send alert to user');
    } else {
      console.log('Alert sent successfully!');
    }

  });
}

// Rotate (compress) log files
workers.rotateLogs = () => {
  // List all log files
  // pass boolean to include compressed files
  _logs.list(false, (err, logs) => {
    if (!err && logs && logs.length > 0) {
      logs.forEach((logname) => {
        // compress data to a different file
        const logId = logname.replace('.log', '');
        const newFileId = `${logId}-${Date.now()}`;
        _logs.compress(logId, newFileId, (err) => {
          if (err) {
            console.log(`Error compressing log file: ${logname}. See error: `, err);
            return;
          }

          // truncate log
          _logs.truncate(logId, (err) => {
            if (err) {
              console.log(`Error truncating log file: ${logId}`);
              return;
            }
            console.log(`Success truncating log file: ${logId}`);
          });
        });
      });
    } else {
      console.log('Error: could not find any logs to rotate.');
    }
  });
}

// Timer to execute the worker-process once per minute
workers.loop = () => {
  // Runs checks every minute.
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000*60);
}

// Timer to execute the log-rotation process once per day
workers.logRotationLoop = () => {
  // Runs once per day.
  setInterval(() => {
    workers.rotateLogs();
  }, 1000*60*60*24);
}

// logging
workers.log = (originalCheckdata,checkOutcome,state,alertWarranted,checktime) => {
  const logData = {
    'checkInfo': originalCheckdata,
    'outcome': checkOutcome,
    state,
    alertWarranted,
    'time': checktime
  };
  // Convert data to string
  const logString = JSON.stringify(logData);
  // Create filename
  const filename = originalCheckdata.id;
  //Append individual log to file.
  _logs.append(filename, logString, (err) => {
    if (err) {
      console.log('Logging to file failed.');
      return;
    }

    console.log('Logging to file succeeded.');
  });
};

// Init script
workers.init = () => {
  // Execute all the checks inmediately
  workers.gatherAllChecks();
  // Call loop so checks execute later on
  workers.loop();
  // Compress all the logs inmediately
  workers.rotateLogs();
  // Call the compression loop so logs will be compressed later on
  workers.logRotationLoop();
}


// Export module
module.exports = workers;
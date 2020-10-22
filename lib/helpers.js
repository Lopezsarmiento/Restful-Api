/*
import { config } from '../config';
 * Helpers for various tasks
 *
 */

// Dependencies
const crypto = require("crypto");
const config = require("./config");
const https = require('https');
const querystring = require('querystring');

// container
const helpers = {};

// Create a SHA256 hash
helpers.hash = (str) => {
  if (typeof str !== "string" || str.length <= 0) {
    console.log(
      "pass is either not a string or length is less or equal than 0"
    );
    return false;
  }

  const hash = crypto
    .createHmac("sha256", config.hashingSecret)
    .update(str)
    .digest("hex");

  return hash;
};

// Parse a JSON obj in all cases without throwing
helpers.parseJsonToObject = (str) => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (error) {
    console.log("error while parsing buffer: ", error);
    return error;
  }
};

// Create a n alphanumeric random string
helpers.createRandomString = (strLength) => {
  // length validations
  strLength =
    typeof strLength === "number" && strLength > 0 ? strLength : false;

  if (!strLength) {
    return false;
  }

  // define possible chars
  const possibleChars = "abcdefghijklmnopqrstuvwxyz0123456789";

  let str = "";
  for (i = 1; i <= strLength; i++) {
    //Get random char from possibleChars
    const randomChar = possibleChars.charAt(
      Math.floor(Math.random() * possibleChars.length)
    );
    // Append char to str
    str += randomChar;
  }

  // Return final str
  return str;
};

// Send sms via twilio
helpers.sendTwilioSms = (phone, msg, callback) => {
  // validate params
  phone = typeof(phone) === 'string' && phone.trim().length === 10 ? phone.trim(): false;
  msg = typeof(msg) === 'string' && msg.trim().length > 0 && msg.trim().length < 1600 ? msg.trim() : false;
  
  if (!phone || !msg) {
    return callback('Given params were missing or invalid.');
  }

  // Request payload
  const payload = {
    'From': config.twilio.fromPhone,
    'To': `+1${phone}`,
    'Body': msg
  }

  // stringify payload
  const stringPayload = querystring.stringify(payload);
  // configure request details
  const requestDetails = {
    'protocol': 'https:',
    'hostname': 'api.twilio.com',
    'method': 'POST',
    'path': `/2010-04-01/Accounts${config.twilio.accountSid}/Messages.json`,
    'auth': `${config.twilio.accountSid}:${config.twilio.authToken}`,
    'headers': {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(stringPayload)
    }
  };

  // instantiate request object
  const req = https.request(requestDetails, (res) => {
    // get status of sent req
    const status = res.statusCode;
    if (status === 200 || status === 201) {
       return callback(false);
    } else {
      callback(`Status code returned was ${status}`);
    }
  });

  // Bind to the error event so it does not get thrown
  req.on('error', (e) => {
    callback(e);
  });

  // Add payload to req
  req.write(stringPayload);
  //  End request
  req.end();

  
}



// Export module
module.exports = helpers;

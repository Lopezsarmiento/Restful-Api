/*
import { config } from '../config';
 * Helpers for various tasks
 *
 */

// Dependencies
const crypto = require("crypto");
const config = require("./config");
const https = require("https");
const querystring = require("querystring");
const fs = require("fs");
const fsPromises = fs.promises;
const path = require("path");

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
  phone =
    typeof phone === "string" && phone.trim().length === 10
      ? phone.trim()
      : false;
  msg =
    typeof msg === "string" && msg.trim().length > 0 && msg.trim().length < 1600
      ? msg.trim()
      : false;

  if (!phone || !msg) {
    return callback("Given params were missing or invalid.");
  }

  // Request payload
  const payload = {
    From: config.twilio.fromPhone,
    To: `+1${phone}`,
    Body: msg,
  };

  // stringify payload
  const stringPayload = querystring.stringify(payload);
  // configure request details
  const requestDetails = {
    protocol: "https:",
    hostname: "api.twilio.com",
    method: "POST",
    path: `/2010-04-01/Accounts${config.twilio.accountSid}/Messages.json`,
    auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(stringPayload),
    },
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
  req.on("error", (e) => {
    callback(e);
  });

  // Add payload to req
  req.write(stringPayload);
  //  End request
  req.end();
};

// helpers.getTemplate = (templateName, callback) => {
//   templateName =
//     typeof templateName === "string" && templateName.length > 0
//       ? templateName
//       : false;
//   if (templateName) {
//     const templateDir = path.join(__dirname, "/../templates/");
//     // Read file
//     fs.readFile(`${templateDir}${templateName}.html`, "utf8", (err, str) => {
//       if (!err && str && str.length > 0) {
//         callback(false, str);
//       } else {
//         callback("No template could be found");
//       }
//     });
//   } else {
//     callback("A valid template name must be specified.");
//   }
// };

helpers.getTemplate = async (templateName, data) => {
  const templateDir = path.join(__dirname, "/../templates/");
  data = typeof data === "object" && data != null ? data : {};
  templateName =
    typeof templateName === "string" && templateName.length > 0
      ? templateName
      : false;

  if (!templateName) {
    return callback("A valid template name must be specified.");
  }

  try {
    const str = await fsPromises.readFile(
      `${templateDir}${templateName}.html`,
      "utf8"
    );
    const finalString = helpers.interpolate(str, data);
    return finalString;
  } catch (error) {
    console.error("Error occured while reading directory!", error);
  }
};

// Add universal header and footer to a string
helpers.AddUniversalTemplates = async (str, data) => {
  str = typeof str === "string" && str.length > 0 ? str : false;
  data = typeof data === "object" && data != null ? data : {};

  try {
    // get header
    const header = await helpers.getTemplate("_header", data);
    const footer = await helpers.getTemplate("_footer", data);
    const fullStr = `${header}${str}${footer}`;
    return fullStr;
  } catch (error) {
    console.log("error while getting univesaltemplates: ", error);
    callback(500, undefined, error);
  }
};

// take a given string and a data object  and find/replace all the keys within it.
helpers.interpolate = (str, data) => {
  str = typeof str === "string" && str.length > 0 ? str : false;
  data = typeof data === "object" && data != null ? data : {};

  // Add the template globals to the data obj
  for (let keyName in config.templateGlobals) {
    if (config.templateGlobals.hasOwnProperty(keyName)) {
      data[`global.${keyName}`] = config.templateGlobals[keyName];
    }
  }

  // For each key in the data obj, insert its value into the string at the correspondent
  for (let key in data) {
    if (data.hasOwnProperty(key) && typeof data[key] === "string") {
      let replace = data[key];
      let find = `{${key}}`;
      str = str.replace(find, replace);
    }
  }
  return str;
};

// Get the contents of a static (public) asset
helpers.getStaticAsset = (filename, callback) => {
  filename =
    typeof filename === "string" && filename.length > 0 ? filename : false;

  if (!filename) {
    return callback("A valid file name was not specified.");
  }

  const publicDir = path.join(__dirname, "/../public");

  fs.readFile(`${publicDir}/${filename}`, (err, data) => {
    if (!err && data) {
      callback(false, data);
    } else {
      callback("No file could be found.");
    }
  });
};

// Export module
module.exports = helpers;

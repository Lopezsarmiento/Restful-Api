/*
import { config } from '../config';
 * Helpers for various tasks
 *
 */

// Dependencies
const crypto = require("crypto");
const config = require("./config");
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

// Export module
module.exports = helpers;

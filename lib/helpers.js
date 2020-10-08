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
// Export module
module.exports = helpers;

/*
/Request handlers
*/

//Dependencies
const _data = require("./data");
const helpers = require("../lib/helpers");

// define handlers
const handlers = {};

handlers._users = {};

// Users - post
// Required data: firstname, lastname, phone, password tosAgreement
// Optional data: none
handlers._users.post = (data, callback) => {
  // required fields validations
  const firstname =
    typeof data.payload.firstname === "string" &&
    data.payload.firstname.trim().length > 0
      ? data.payload.firstname.trim()
      : false;

  const lastname =
    typeof data.payload.lastname === "string" &&
    data.payload.lastname.trim().length > 0
      ? data.payload.lastname.trim()
      : false;

  const phone =
    typeof data.payload.phone === "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;

  const password =
    typeof data.payload.password === "string" &&
    data.payload.password.trim().length > 5
      ? data.payload.password.trim()
      : false;

  const tosAgreement =
    typeof data.payload.tosAgreement === "boolean" && data.payload.tosAgreement
      ? true
      : false;

  if (!firstname || !lastname || !phone || !password || !tosAgreement) {
    return callback(400, { Error: "Missing required fields" });
  }

  // verify if user already exist
  _data.read("users", phone, (err, data) => {
    if (!err) {
      // user was found by phone number
      return callback(400, {
        Error: "A user with that phone number already exists",
      });
    }

    // Hash password
    const hashedPassword = helpers.hash(password);
    if (!hashedPassword) {
      return callback(500, { Error: "Could not hash password" });
    }

    const userObj = {
      firstname,
      lastname,
      phone,
      hashedPassword,
      tosAgreement,
    };

    // Store user in file system
    _data.create("users", phone, userObj, (err) => {
      if (err) {
        console.log(err);
        return callback(500, { Error: "Could not create the new user" });
      }

      callback(200, { Message: "User created successfully" });
    });
  });
};

handlers._users.get = (data, callback) => {};
handlers._users.put = (data, callback) => {};
handlers._users.delete = (data, callback) => {};

//sample handler
handlers.sample = (data, callback) => {
  callback(406, { name: "sample handler" });
};

handlers.ping = (data, callback) => {
  callback(200, { ping: "pong" });
};

handlers.hello = (data, callback) => {
  callback(200, { message: "hello from the back end side." });
};

handlers.notFound = (data, callback) => {
  callback(404);
};

handlers.users = (data, callback) => {
  const availMethods = ["POST", "GET", "PUT", "DELETE"];
  console.log("data: ", data);
  if (availMethods.indexOf(data.method) > -1) {
    handlers._users[data.method.toLowerCase()](data, callback);
  } else {
    // 405 : http for method not allowed
    callback(405);
  }
};
module.exports = handlers;

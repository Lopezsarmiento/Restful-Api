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
    console.log("data in read: ", data);
    if (!err && data) {
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

// users - get
// Required data: phone
// optional data: none
// @TODO ONLY allow auth users to see own object.
handlers._users.get = (data, callback) => {
  // validate phone number
  const phone =
    typeof data.queryStringObject.phone === "string" &&
    data.queryStringObject.phone.trim().length === 10
      ? data.queryStringObject.phone.trim()
      : false;

  if (!phone) {
    return callback(400, { Error: "Missing required field" });
  }

  _data.read("users", phone, (err, data) => {
    if (!err && data) {
      const userInfo = {
        firstname: data.firstname,
        lastname: data.lastname,
        phone: data.phone,
      };

      callback(200, userInfo);
    } else {
      callback(404, { Message: "User not found" });
    }
  });
};

// Users - Put
// Required data: phone
// Optional data: firstname,lastname,password (at least one must be passed)
// @TODO : only allow auth users
handlers._users.put = (data, callback) => {
  // validate phone number
  const phone =
    typeof data.payload.phone === "string" &&
    data.payload.phone.trim().length === 10
      ? data.payload.phone.trim()
      : false;
  // check for opt fields
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

  const password =
    typeof data.payload.password === "string" &&
    data.payload.password.trim().length > 5
      ? data.payload.password.trim()
      : false;

  if (!phone) {
    return callback(400, { Error: "Phone number is missing" });
  }

  if (firstname || lastname || password) {
    // user lookup
    _data.read("users", phone, (err, userData) => {
      if (err) {
        return callback(400, { Error: "The specified user does not exist" });
      }

      // update necessary fields
      if (firstname) {
        userData.firstname = firstname;
      }

      if (lastname) {
        userData.lastname = lastname;
      }

      if (password) {
        // hash pasword
        const hashedPassword = helpers.hash(password);
        if (!hashedPassword) {
          return callback(500, { Error: "Could not hash password" });
        }
        userData.password = hashedPassword;
      }

      // stores updates
      _data.update("users", phone, userData, (err) => {
        if (err) {
          return callback(500, { Error: "Error updating the user info" });
        }
        callback(200, { message: "User info successfully updated" });
      });
    });
  } else {
    return callback(400, { Error: "Missing required fields for update" });
  }
};

// Users- delete
// Required field: phone
// @TODO allow ONLY auth users
// @TODO delete any other files associated with  the user
handlers._users.delete = (data, callback) => {
  // validate phone number
  const phone =
    typeof data.queryStringObject.phone === "string" &&
    data.queryStringObject.phone.trim().length === 10
      ? data.queryStringObject.phone.trim()
      : false;

  if (!phone) {
    return callback(400, { Error: "Missing required field" });
  }

  _data.read("users", phone, (err, data) => {
    if (!err && data) {
      _data.delete("users", phone, (err) => {
        console.log("error in delete", err);
        if (!err) {
          return callback(200, { Message: "User deleted successfully" });
        } else {
          return callback(500, {
            Error: "Could not delete the specified user",
          });
        }
      });
    } else {
      return callback(400, { Error: "Could not find the specified user" });
    }
  });
};

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

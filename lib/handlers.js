/*
import { config } from './config';
/Request handlers
*/

//Dependencies
const _data = require("./data");
const helpers = require("../lib/helpers");
const config = require("../lib/config");

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
// ONLY allow auth users to see own object.
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

  // authorization
  // Get token
  const token =
    typeof data.headers.token === "string" ? data.headers.token : false;

  // verify token is valid
  handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
    if (!tokenIsValid) {
      return callback(403, { Error: "token missing or invalid" });
    }

    _data.read("users", phone, (err, data) => {
      if (!err && data) {
        const userInfo = {
          firstname: data.firstname,
          lastname: data.lastname,
          phone: data.phone,
          checks: data.checks,
        };

        callback(200, userInfo);
      } else {
        callback(404, { Message: "User not found" });
      }
    });
  });
};

// Users - Put
// Required data: phone
// Optional data: firstname,lastname,password (at least one must be passed)
// ONLY allow auth users
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
    // authorization
    // Get token
    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;

    // verify token is valid
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (!tokenIsValid) {
        return callback(403, { Error: "token missing or invalid" });
      }
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
    });
  } else {
    return callback(400, { Error: "Missing required fields for update" });
  }
};

// Users- delete
// Required field: phone
// allow ONLY auth users
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

  // authorization
  // Get token
  const token =
    typeof data.headers.token === "string" ? data.headers.token : false;

  // verify token is valid
  handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
    if (!tokenIsValid) {
      return callback(403, { Error: "token missing or invalid" });
    }
    // user lookup
    _data.read("users", phone, (err, userData) => {
      if (!err && userData) {
        _data.delete("users", phone, (err) => {
          console.log("error in delete", err);
          if (!err) {
            // delete checks associated with the user
            const userChecks =
              typeof userData.checks === "object" &&
              userData.checks instanceof Array
                ? userData.checks
                : [];

            const checksToDelete = userChecks.length;
            if (checksToDelete <= 0) {
              return callback(200, {
                Message: "User deleted successfully",
              });
            }

            let checksDeleted = 0;
            let deletionErrors = false;

            // loop thru checks
            userChecks.forEach((checkId) => {
              // delete check
              _data.delete("checks", checkId, (err) => {
                if (err) {
                  deletionErrors = true;
                }

                checksDeleted++;
                if (checksDeleted === checksToDelete) {
                  if (!deletionErrors) {
                    return callback(200, {
                      Message: "User deleted successfully",
                    });
                  }
                  callback(500, {
                    Error: "Errors encounter while deleting checks",
                  });
                }
              });
            });
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
  });
};

// container for all token methods
handlers._tokens = {};

// post
// Required data: phone, password
// opt data: none
handlers._tokens.post = (data, callback) => {
  // validate req fields
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

  if (!phone || !password) {
    return callback(400, { Error: "Missing required fields" });
  }

  // Lookup for user matching criteria
  _data.read("users", phone, (err, userData) => {
    if (err) {
      return callback(400, { Error: "Could not find the specified user" });
    }

    // Hash password
    const hashedPassword = helpers.hash(password);
    if (!hashedPassword) {
      return callback(500, { Error: "Could not hash password" });
    }

    // chech for password matching
    if (hashedPassword !== userData.hashedPassword) {
      return callback(400, {
        Error: "Password does not match stored password",
      });
    }

    // Create token with random name and expiration 1 hour in the future.
    const tokenId = helpers.createRandomString(20);
    const expires = Date.now() * 1000 * 60 * 60;
    const tokenobj = {
      phone,
      id: tokenId,
      expires,
    };

    // Store token
    _data.create("tokens", tokenId, tokenobj, (err) => {
      if (err) {
        return callback(500, { Error: "Could not save new token" });
      }

      callback(200, tokenobj);
    });
  });
};

// get
// Req data: tokenId
// Opt data: none
handlers._tokens.get = (data, callback) => {
  // validate tokenId
  const tokenId =
    typeof data.queryStringObject.tokenId === "string" &&
    data.queryStringObject.tokenId.trim().length === 20
      ? data.queryStringObject.tokenId.trim()
      : false;

  if (!tokenId) {
    return callback(400, {
      Error: "Missing required field or field is invalid",
    });
  }

  _data.read("tokens", tokenId, (err, data) => {
    if (!err && data) {
      callback(200, data);
    } else {
      callback(404, { Message: "TokenId not found" });
    }
  });
};
// put
// Required data: id, extend
// Opt data: none
handlers._tokens.put = (data, callback) => {
  const id =
    typeof data.payload.id === "string" && data.payload.id.trim().length === 20
      ? data.payload.id.trim()
      : false;

  const extend =
    typeof data.payload.extend === "boolean" && data.payload.extend
      ? data.payload.extend
      : false;

  if (id && extend) {
    // look up for token data
    _data.read("tokens", id, (err, tokenData) => {
      if (id && tokenData) {
        // check for token expiration
        if (tokenData.expires < Date.now()) {
          callback(400, {
            Error: "Token has already expired, and cannot be extended",
          });
        }

        // update token expiration
        tokenData.expires = Date.now() + 1000 * 60 * 60;

        // store tokenData
        _data.update("tokens", id, tokenData, (err) => {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: "Could not update token expiration date" });
          }
        });
      } else {
        callback(400, { Error: "Specified token does not exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields or invalid" });
  }
};

// delete
handlers._tokens.delete = (data, callback) => {
  // validate phone number
  const id =
    typeof data.queryStringObject.id === "string" &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id.trim()
      : false;

  if (!id) {
    return callback(400, { Error: "Missing required field" });
  }

  _data.read("tokens", id, (err, data) => {
    if (!err && data) {
      _data.delete("tokens", id, (err) => {
        console.log("error in delete", err);
        if (!err) {
          return callback(200, { Message: "token deleted successfully" });
        } else {
          return callback(500, {
            Error: "Could not delete the specified token",
          });
        }
      });
    } else {
      return callback(400, { Error: "Could not find the specified token" });
    }
  });
};

handlers._tokens.verifyToken = (id, phone, callback) => {
  // lookup for token
  _data.read("tokens", id, (err, tokenData) => {
    if (err) {
      return callback(false);
    }
    // check token belongs to the user and it is not expired
    if (tokenData.phone !== phone || tokenData.expires < Date.now()) {
      return callback(false);
    }
    return callback(true);
  });
};

// Checks

// Container for all the checks
handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successcodes, timeoutSeconds
// Opt data: none
handlers._checks.post = (data, callback) => {
  // input validation
  const protocol =
    typeof data.payload.protocol === "string" &&
    ["https", "http"].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;

  const url =
    typeof data.payload.url === "string" && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;

  const method =
    typeof data.payload.method === "string" &&
    ["post", "get", "put", "delete"].indexOf(data.payload.method) > -1
      ? data.payload.method
      : false;

  const successcodes =
    typeof data.payload.successcodes === "object" &&
    data.payload.successcodes instanceof Array &&
    data.payload.successcodes.length > 0
      ? data.payload.successcodes
      : false;

  const timeoutseconds =
    typeof data.payload.timeoutseconds === "number" &&
    data.payload.timeoutseconds % 1 === 0 &&
    data.payload.timeoutseconds >= 1 &&
    data.payload.timeoutseconds <= 5
      ? data.payload.timeoutseconds
      : false;

  // exit if missing inputs or invalid
  if (!protocol || !url || !method || !successcodes || !timeoutseconds) {
    console.log(protocol, url, method, successcodes, timeoutseconds);
    return callback(400, {
      Error: "Missing required inputs or inputs are invalid",
    });
  }

  // Get token form headers
  // authorization
  // Get token
  const token =
    typeof data.headers.token === "string" ? data.headers.token : false;

  // user lookup by reading token
  _data.read("tokens", token, (err, tokenData) => {
    if (err || !tokenData) {
      return callback(403);
    }

    const userPhone = tokenData.phone;
    // Get user data
    _data.read("users", userPhone, (err, userData) => {
      if (err || !userData) {
        return callback(403);
      }

      const userChecks =
        typeof userData.checks === "object" && userData.checks instanceof Array
          ? userData.checks
          : [];

      // validate amount of checks
      if (userChecks.length === config.maxChecks) {
        return callback(400, {
          Error: `The user has already the maximum checks permitted (${config.maxChecks})`,
        });
      }

      // Create id for check
      const checkId = helpers.createRandomString(20);

      // create check obj
      const checkObject = {
        id: checkId,
        userPhone,
        protocol,
        url,
        method,
        successcodes,
        timeoutseconds,
      };

      // save object
      _data.create("checks", checkId, checkObject, (err) => {
        if (err) {
          return callback(500, { Error: "Could not create the new check" });
        }

        //add check id to users object
        userData.checks = userChecks;
        userData.checks.push(checkId);

        // Save new user data
        _data.update("users", userPhone, userData, (err) => {
          if (err) {
            return callback(500, {
              Error: "Could not update the user with the new check",
            });
          }
          // return data with new check
          callback(200, checkObject);
        });
      });
    });
  });
};

// Checks - get
// Required data: id
// Optional data: none
handlers._checks.get = (data, callback) => {
  // validate id number
  const id =
    typeof data.queryStringObject.id === "string" &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id.trim()
      : false;

  if (!id) {
    return callback(400, { Error: "Missing required field" });
  }

  // check lookup
  _data.read("checks", id, (err, checkdata) => {
    if (err || !checkdata) {
      return callback(404);
    }

    // authorization
    // Get token
    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;

    // verify token is valid
    handlers._tokens.verifyToken(token, checkdata.userPhone, (tokenIsValid) => {
      if (!tokenIsValid) {
        return callback(403, { Error: "token missing or invalid" });
      }

      callback(200, checkdata);
    });
  });
};

// Checks - put
// Required data: id
// Opt data: protocol, url, method, successcodes, timeoutseconds
// at least one must be included
handlers._checks.put = (data, callback) => {
  const id =
    typeof data.payload.id === "string" && data.payload.id.trim().length === 20
      ? data.payload.id.trim()
      : false;

  // input validation
  const protocol =
    typeof data.payload.protocol === "string" &&
    ["https", "http"].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;

  const url =
    typeof data.payload.url === "string" && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;

  const method =
    typeof data.payload.method === "string" &&
    ["post", "get", "put", "delete"].indexOf(data.payload.method) > -1
      ? data.payload.method
      : false;

  const successcodes =
    typeof data.payload.successcodes === "object" &&
    data.payload.successcodes instanceof Array &&
    data.payload.successcodes.length > 0
      ? data.payload.successcodes
      : false;

  const timeoutseconds =
    typeof data.payload.timeoutseconds === "number" &&
    data.payload.timeoutseconds % 1 === 0 &&
    data.payload.timeoutseconds >= 1 &&
    data.payload.timeoutseconds <= 5
      ? data.payload.timeoutseconds
      : false;

  if (!id) {
    return callback(400, { Error: "Missing required field" });
  }

  if (protocol || url || method || successcodes || timeoutseconds) {
    // check lookup
    _data.read("checks", id, (err, checkdata) => {
      if (err || !checkdata) {
        return callback(404, { Error: "CheckId does not exist" });
      }

      // authorization
      // Get token
      const token =
        typeof data.headers.token === "string" ? data.headers.token : false;

      // verify token is valid
      handlers._tokens.verifyToken(
        token,
        checkdata.userPhone,
        (tokenIsValid) => {
          if (!tokenIsValid) {
            return callback(403, { Error: "token missing or invalid" });
          }

          // update check data when necessary
          if (protocol) {
            checkdata.protocol = protocol;
          }

          if (url) {
            checkdata.url = url;
          }

          if (method) {
            checkdata.method = method;
          }

          if (successcodes) {
            checkdata.successcodes = successcodes;
          }

          if (timeoutseconds) {
            checkdata.timeoutseconds = timeoutseconds;
          }

          // save updates
          _data.update("checks", id, checkdata, (err) => {
            if (err) {
              return callback(500, { Error: "error updating check data" });
            }

            callback(200, checkdata);
          });
        }
      );
    });
  } else {
    return callback(400, { Error: "Missing fields to update" });
  }
};

// Checks - Delete
// Required data: id
// opt data: none
handlers._checks.delete = (data, callback) => {
  // validate phone number
  const id =
    typeof data.queryStringObject.id === "string" &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id.trim()
      : false;

  if (!id) {
    return callback(400, { Error: "Missing required field" });
  }

  // check lookup
  _data.read("checks", id, (err, checkdata) => {
    if (err || !checkdata) {
      return callback(404, { Error: "Specified id does not exist" });
    }

    // authorization
    // Get token
    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;

    // verify token is valid
    handlers._tokens.verifyToken(token, checkdata.userPhone, (tokenIsValid) => {
      if (!tokenIsValid) {
        return callback(403, { Error: "token missing or invalid" });
      }
      // delete check
      _data.delete("checks", id, (err) => {
        if (err) {
          return callback(500, { Error: "Could not delete check data" });
        }
        // lookup user and modify checks
        _data.read("users", checkdata.userPhone, (err, userData) => {
          if (err || !checkdata) {
            return callback(500, { Error: "Could not find user" });
          }

          // get user checks
          const userChecks =
            typeof userData.checks === "object" &&
            userData.checks instanceof Array
              ? userData.checks
              : [];

          // get check position
          checkPosition = userChecks.indexOf(id);

          if (checkPosition <= -1) {
            return callback(500, {
              Error: "Could not find the check on the users object",
            });
          }
          // Remove check from array
          userChecks.splice(checkPosition, 1);

          // save new userChecks
          // save updates
          _data.update("users", checkdata.userPhone, userData, (err) => {
            if (err) {
              return callback(500, { Error: "error updating check data" });
            }
            // return update userdata
            callback(200, userData);
          });
        });
      });
    });
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
  if (availMethods.indexOf(data.method) > -1) {
    handlers._users[data.method.toLowerCase()](data, callback);
  } else {
    // 405 : http for method not allowed
    callback(405);
  }
};

handlers.tokens = (data, callback) => {
  const availMethods = ["POST", "GET", "PUT", "DELETE"];
  if (availMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method.toLowerCase()](data, callback);
  } else {
    // 405 : http for method not allowed
    callback(405);
  }
};

handlers.checks = (data, callback) => {
  const availMethods = ["POST", "GET", "PUT", "DELETE"];
  if (availMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method.toLowerCase()](data, callback);
  } else {
    // 405 : http for method not allowed
    callback(405);
  }
};
module.exports = handlers;

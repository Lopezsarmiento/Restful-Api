/*
 * Server related file
 *
 */

// Dependencies
const http = require("http");
const https = require("https");
const fs = require("fs");
const { StringDecoder } = require("string_decoder");
const url = require("url");
const config = require("./config");
const _data = require("./data");
const handlers = require("./handlers");
const helpers = require("./helpers");
const path = require("path");
const util = require("util");
const debug = util.debuglog("server"); // NODE_DEBUG=server node index.js

// @todo remove this
// helpers.sendTwilioSms('1158983971', 'Hello from twilio', (err) => {
//   console.log('error: ', err);
// })
// TEST writing data
// @TODO delete this
// _data.create("test", "newFile", { foo: "bar" }, (err) => {
//   console.log("error: ", err);
// });

// _data.read("test", "newFile1", (err, data) => {
//   console.log("error: ", err, "data: ", data);
// });

// _data.update("test", "newFile", { fizz: "buzz", user: "sumercisco" }, (err) => {
//   console.log("error: ", err);
// });

// instantiate server object
const server = {};

server.httpserver = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

server.serverOptions = {
  key: fs.readFileSync(path.join(__dirname, "/../https/key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "/../https/cert.pem")),
};

// instantiate https server
server.httpsserver = https.createServer(server.serverOptions, (req, res) => {
  server.unifiedServer(req, res);
});

server.unifiedServer = (req, res) => {
  // Get url and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");

  // //Get query string
  const queryStringObject = url.parse(req.url, true).query;

  //Get http method
  const method = req.method;

  // Get headers
  const headers = req.headers;

  // Get the payload
  const decoder = new StringDecoder("utf-8");
  let buffer = "";
  req.on("data", (data) => {
    buffer += decoder.write(data);
  });

  req.on("end", () => {
    buffer += decoder.end();

    // choose handler
    let chosenHandler =
      typeof server.router[trimmedPath] !== "undefined"
        ? server.router[trimmedPath]
        : handlers.notFound;

    chosenHandler =
      trimmedPath.indexOf("public/") > -1 ? handlers.public : chosenHandler;

    // build data obj
    const data = {
      trimmedPath,
      method,
      queryStringObject,
      headers,
    };

    // sometimes there is no data in buffer
    if (buffer) {
      data.payload = helpers.parseJsonToObject(buffer);
    }
    // Route the request to the handler specified
    chosenHandler(data, (statusCode, payload, contentType) => {
      // Determine type of response (fallback to JSON)
      contentType = typeof contentType === "string" ? contentType : "json";
      statusCode = typeof statusCode === "number" ? statusCode : 200;

      // Return the response-parts that are content-spsecific
      let payloadString = "";
      if (contentType === "json") {
        res.setHeader("Content-Type", "application/json");
        payload = typeof payload === "object" ? payload : {};
        payloadString = JSON.stringify(payload);
      }

      if (contentType === "html") {
        res.setHeader("Content-Type", "text/html");
        payloadString = typeof payload === "string" ? payload : "";
      }

      if (contentType === "favicon") {
        res.setHeader("Content-Type", "image/x-icon");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }

      if (contentType === "css") {
        res.setHeader("Content-Type", "text/css");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }

      if (contentType === "png") {
        res.setHeader("Content-Type", "image/png");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }

      if (contentType === "jpg") {
        res.setHeader("Content-Type", "image/jpeg");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }

      if (contentType === "plain") {
        res.setHeader("Content-Type", "text/plain");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }

      // return the response-parts that are common to all content-types
      res.writeHead(statusCode);
      res.end(payloadString);

      //log request path
      if (statusCode === 200) {
        // the following debug logs statements get executed when app is execute as:
        // NODE_DEBUG=server node index.js
        debug(
          "\x1b[32m%s\x1b[0m",
          `${method.toUpperCase()}/${trimmedPath} ${statusCode}`
        );
      } else {
        debug(
          "\x1b[31m%s\x1b[0m",
          `${method.toUpperCase()}/${trimmedPath} ${statusCode}`
        );
      }
    });
  });
};

// define router
server.router = {
  "": handlers.index,
  sample: handlers.sample,
  ping: handlers.ping,
  hello: handlers.hello,
  "account/create": handlers.accountCreate,
  "account/edit": handlers.accountEdit,
  "account/deleted": handlers.accountDeleted,
  "session/create": handlers.sessionCreate,
  "session/deleted": handlers.sessionDeleted,
  "checks/all": handlers.checkList,
  "checks/create": handlers.checksCreate,
  "checks/edit": handlers.checksEdit,
  "api/users": handlers.users,
  "api/tokens": handlers.tokens,
  "api/checks": handlers.checks,
  public: handlers.public,
  "favicon.ico": handlers.favicon,
};

// Init script
server.init = () => {
  // Start servers
  server.httpserver.listen(config.httpPort, () => {
    console.log(
      "\x1b[32m%s\x1b[0m",
      `server listening on port: ${config.httpPort}.`
    );
    console.log(
      "\x1b[42m%s\x1b[0m",
      `server listening on port: ${config.httpPort}.`
    );
  });

  server.httpsserver.listen(config.httpsPort, () => {
    console.log(
      "\x1b[42m%s\x1b[0m",
      `server listening on port: ${config.httpsPort}.`
    );
  });
};

// Export module
module.exports = server;
/* to test localhost on terminal:
 * curl localhost: <port number>
 */

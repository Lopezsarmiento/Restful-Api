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
const path = require('path');
 
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
    const chosenHandler =
      typeof server.router[trimmedPath] !== "undefined"
        ? server.router[trimmedPath]
        : handlers.notFound;

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
    chosenHandler(data, (statusCode, payload) => {
      statusCode = typeof statusCode === "number" ? statusCode : 200;
      payload = typeof payload === "object" ? payload : {};

      // convert payload to a str
      const payloadString = JSON.stringify(payload);

      // return response
      res.setHeader("Content-Type", "application/json");
      res.writeHead(statusCode);
      res.end(payloadString);

      //log request path
      console.log("returning the response: ", statusCode, payloadString);
    });
  });
};

// define router
server.router = {
  sample: handlers.sample,
  ping: handlers.ping,
  hello: handlers.hello,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
};

// Init script
server.init = () => {
  // Start servers
  server.httpserver.listen(config.httpPort, () => {
    console.log(`server listening on port: ${config.httpPort}.`);
  });
  
  server.httpsserver.listen(config.httpsPort, () => {
    console.log(`server listening on port: ${config.httpsPort}.`);
  });
}


// Export module
module.exports = server;
/* to test localhost on terminal:
 * curl localhost: <port number>
 */

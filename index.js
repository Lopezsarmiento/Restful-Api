/*
 * Primary file for the API
 *
 *
 */

// Dependencies
const http = require("http");
const https = require("https");
const fs = require("fs");
const { StringDecoder } = require("string_decoder");
const url = require("url");
const config = require("./lib/config");
const _data = require("./lib/data");
const handlers = require("./lib/handlers");
const helpers = require("./lib/helpers");

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

// instantiate http server
const httpserver = http.createServer((req, res) => {
  unifiedServer(req, res);
});

httpserver.listen(config.httpPort, () => {
  console.log(`server listening on port: ${config.httpPort}.`);
});

const serverOptions = {
  key: fs.readFileSync("./https/key.pem"),
  cert: fs.readFileSync("./https/cert.pem"),
};
// // instantiate https server
const httpsserver = https.createServer(serverOptions, (req, res) => {
  unifiedServer(req, res);
});

httpsserver.listen(config.httpsPort, () => {
  console.log(`server listening on port: ${config.httpsPort}.`);
});

const unifiedServer = (req, res) => {
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
      typeof router[trimmedPath] !== "undefined"
        ? router[trimmedPath]
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
const router = {
  sample: handlers.sample,
  ping: handlers.ping,
  hello: handlers.hello,
  users: handlers.users,
  tokens: handlers.tokens,
};
/* to test localhost on terminal:
 * curl localhost: <port number>
 */

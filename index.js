/*
 * Primary file for the API
 *
 *
 */

// Dependencies
const http = require("http");
const { StringDecoder } = require("string_decoder");
const url = require("url");

const PORT = 6600;

// create server
const server = http.createServer((req, res) => {
  // Get url and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");

  // //Get query string
  // const queryStringObject = parsedUrl.query;
  // console.log("query: ", queryStringObject);

  //Get http method
  const method = req.method;

  // Get headers
  const headers = req.headers;
  console.log("headers: ", headers);

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
      headers,
      payload: buffer,
    };

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
});

server.listen(PORT, () => {
  console.log(`server listening on port: ${PORT}`);
});

// define handlers
const handlers = {};

//sample handler
handlers.sample = (data, callback) => {
  callback(406, { name: "sample handler" });
};

handlers.notFound = (data, callback) => {
  callback(404);
};

// define router
const router = {
  sample: handlers.sample,
};
/* to test localhost on terminal:
 * curl localhost: <port number>
 */

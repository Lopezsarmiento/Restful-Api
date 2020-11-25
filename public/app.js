/*
 * Front end logic for app
 *
 */

// container for application
const app = {};

// config
app.config = {
  sessionToken: false,
};

// AJAX Client (for the restful API)
app.client = {};

// Interface for making API calls
app.client.request = (
  headers,
  path,
  method,
  queryStringObject,
  payload,
  callback
) => {
  const availableMethods = ["POST", "GET", "PUT", "DELETE"];
  // set defaults
  headers = typeof headers === "object" && headers !== null ? headers : {};
  path = typeof path === "string" ? path : "/";
  method =
    typeof method === "string" && availableMethods.indexOf(method) > -1
      ? method.toUpperCase()
      : "GET";
  queryStringObject =
    typeof queryStringObject === "object" && queryStringObject !== null
      ? queryStringObject
      : {};
  payload = typeof payload === "object" && payload !== null ? payload : {};
  callback = typeof callback === "function" ? callback : false;

  // for each query string param added to the path
  let requestUrl = `${path}?`;
  let counter = 0;
  for (let queryKey in queryStringObject) {
    if (queryStringObject.hasOwnProperty(queryStringObject)) {
      counter++;
      //if at least one query string param has been added, prepend new one with ampersand
      if (counter > 1) {
        requestUrl += "&";
      }
      // Add key and value
      requestUrl += `${queryStringObject}=${queryStringObject[queryKey]}`;
    }
  }

  // build http request as JSON type
  const xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader("Content-Type", "application/json");

  // for each header sent add it to the request
  for (let headerKey in headers) {
    if (headers.hasOwnProperty(headers)) {
      xhr.setRequestHeader(headerKey, headers[headerKey]);
    }
  }

  // if there is a current session token add it to the request
  if (app.config.sessionToken) {
    xhr.setRequestHeader("token", app.config.sessionToken.id);
  }

  // When the request comes back handle the response
  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      const statusCode = xhr.status;
      const responseReturned = xhr.responseText;
      console.log("text response: ", responseReturned);
      console.log("status response: ", statusCode);

      // callback if requested
      if (callback) {
        try {
          const parsedResponse = JSON.parse(responseReturned);
          callback(statusCode, parsedResponse);
        } catch (error) {
          callback(statusCode, false);
        }
      }
    }
  };

  // Send payload
  const payloadString = JSON.stringify(payload);
  xhr.send(payloadString);
};

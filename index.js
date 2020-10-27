/*
 * Primary file for the API
 */

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');

// Declare app
const app = {};

// Init function
app.init = () => {
  // Start server
  server.init();

  // Start workers
  workers.init();
};

// execute
app.init();

// Export module
module.exports = app;
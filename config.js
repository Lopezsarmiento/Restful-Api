// create and export config vars
const environments = {};

environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: "staging",
};

environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: "production",
};

const currentEnvironment = process.env.NODE_ENV
  ? process.env.NODE_ENV.toLocaleLowerCase()
  : "";

const environmentToExport =
  environments[currentEnvironment] === Object
    ? environments[currentEnvironment]
    : environments.staging;

//Export module
module.exports = environmentToExport;

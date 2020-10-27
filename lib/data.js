// Storing and editing data

// dependencies
const fs = require("fs");
const path = require("path");
const helpers = require("./helpers");

// module container
const lib = {};

//Base directory
lib.baseDir = path.join(__dirname, "/../.data/");

// write data into file
lib.create = (dir, filename, data, callback) => {
  //open file for writing
  fs.open(
    `${lib.baseDir}/${dir}/${filename}.json`,
    "wx",
    (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        //convert data to string.
        const stringData = JSON.stringify(data);

        //write to file and close it.
        fs.writeFile(fileDescriptor, stringData, (err) => {
          if (!err) {
            fs.close(fileDescriptor, (err) => {
              if (!err) {
                callback(false);
              } else {
                callback("Error closing new file");
              }
            });
          } else {
            callback("Error writing to new file: ", err);
          }
        });
      } else {
        callback("Could not create new file, it may already exist");
      }
    }
  );
};

lib.read = (dir, filename, callback) => {
  fs.readFile(`${lib.baseDir}/${dir}/${filename}.json`, "utf8", (err, data) => {
    if (!err && data) {
      const parsedData = helpers.parseJsonToObject(data);
      return callback(false, parsedData);
    } else {
      return callback(err, data);
    }
  });
};

lib.update = (dir, filename, data, callback) => {
  // open the file for writing
  fs.open(
    `${lib.baseDir}/${dir}/${filename}.json`,
    "r+",
    (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        // convert data to string
        const stringData = JSON.stringify(data);

        // truncate the file
        fs.ftruncate(fileDescriptor, (err) => {
          if (!err) {
            //write to file and close it.
            fs.writeFile(fileDescriptor, stringData, (err) => {
              if (!err) {
                fs.close(fileDescriptor, (err) => {
                  if (!err) {
                    callback(false);
                  } else {
                    callback("Error closing existing file");
                  }
                });
              } else {
                callback("Error writing to existing file");
              }
            });
          } else {
            callback("Error truncating the file");
          }
        });
      } else {
        callback("Could not open the file for updating, it may not exit yet");
      }
    }
  );
};

lib.delete = (dir, filename, callback) => {
  // remove file
  fs.unlink(`${lib.baseDir}/${dir}/${filename}.json`, (err) => {
    if (!err) {
      return callback(false);
    } else {
      return callback("error deleting the file");
    }
  });
};

// List all items in a directory
lib.list = (dir, callback) => {
  fs.readdir(`${lib.baseDir}${dir}/`, (err, data) =>{
    if (!err && data && data.length > 0) {
      const trimmedFilenames = [];
      data.forEach((filename) => {
        trimmedFilenames.push(filename.replace('.json', ''));
      });
      callback(false, trimmedFilenames);
    } else {
      callback(err, data)
    }


  });
}

// export module
module.exports = lib;

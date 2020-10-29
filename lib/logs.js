/*
*Library for storing and rotating logs.
*
*/

// Dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib'); // lib for compressing and decompressing files.

// Container for the module
const lib = {};

//Base directory
lib.baseDir = path.join(__dirname, "/../.logs/");

// Append a string to a file.
// Create the file if it does NOT exist
lib.append = (file, str, callback) => {
  // open file for appending
  fs.open(`${lib.baseDir}${file}.log`, 'a', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Append to the file and close it
      fs.appendFile(fileDescriptor, `${str}\n`, (err) => {
        if (err) {
          callback('Error appending to file.');
          return;
        }

        fs.close(fileDescriptor, (err) => {
          if (err) {
            callback('Error closing file that was being appended.');
            return;
          }
          
          callback(false);
        });
      }); 

    } else {
      callback('Could not open file for appending process.')
    }
  });
};

// List logs and optionally include compressed logs
lib.list = (includeCompressedLogs, callback) => {
  fs.readdir(lib.baseDir,(err, data) => {
    if (!err && data && data.length > 0) {
      // gather logs to list
      const trimmedFilenames = [];
      // loop thru files
      data.forEach((filename) => {
        // Add .log files
        if (filename.indexOf('.log') > -1) {
          trimmedFilenames.push(filename.replace('.log', ''));
        }

        // Add compressed files if required
        if (includeCompressedLogs && filename.indexOf('.gz.b64') > -1) {
          trimmedFilenames.push(filename.replace('.gz.b64'), '');
        }
      });

      // return list
      callback(false, trimmedFilenames);
      
    } else {
      callback(err, data);
    }
  });
};

// Compress the contents of .log file into a gz.b64 file
// within the same directory.
lib.compress = (logId, newFileId, callback) => {
  const sourceFile = `${logId}.log`;
  const destFile = `${newFileId}.gz.b64`;

  // Read source file
  fs.readFile(`${lib.baseDir}${sourceFile}`, 'utf8', (err, inputString) => {
    if (!err && inputString) {
      // compress the data using gzip
      zlib.gzip(inputString, (err, buffer) => {
        if (!err && buffer) {
          //Send data to destination file
          fs.open(`${lib.baseDir}${destFile}`, 'wx', (err, fileDescriptor) => {
            if (!err && fileDescriptor) {
              // write to destination file
              fs.writeFile(fileDescriptor, buffer.toString('base64'), (err) => {
                if (err) {
                  callback(err);
                  return;
                }
                // close destination file
                fs.close(fileDescriptor, (err) => {
                  if (err) {
                    callback(err);
                    return;
                  }

                  callback(false);
                });
              });
            } else {
              callback(err);
            }
          });
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

// Decompress contents of a .gz.b64 file into a variable
lib.decompress = (fileId, callback) => {
  const filename = `${fileId}.gz.b64`;
  // Read content file
  fs.readFile(`${lib.baseDir}${filename}`, 'utf8', (err, str) => {
    if (!err && str) {
      // Decompress data
      const inputBuffer = Buffer.from(str, 'base64');
      // unzip process
      zlib.unzip(inputBuffer, (err, outputBuffer) => {
        if (!err && outputBuffer) {
          const str = outputBuffer.toString();
          callback(false, str);
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

// Truncate log file.
lib.truncate = (logId, callback) => {
  fs.truncate(`${lib.baseDir}${logId}.log`, 0, (err) => {
    if (err) {
      return callback(err);
    }
    callback(false);
  });
}



// Export module
module.exports = lib;

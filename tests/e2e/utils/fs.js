"use strict";
var fs = require('fs');
var process_1 = require('./process');
function readFile(fileName) {
    return new Promise(function (resolve, reject) {
        fs.readFile(fileName, 'utf-8', function (err, data) {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}
exports.readFile = readFile;
function writeFile(fileName, content) {
    return new Promise(function (resolve, reject) {
        fs.writeFile(fileName, content, function (err) {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
exports.writeFile = writeFile;
function deleteFile(path) {
    return new Promise(function (resolve, reject) {
        fs.unlink(path, function (err) {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
exports.deleteFile = deleteFile;
function moveFile(from, to) {
    return process_1.exec('mv', from, to);
}
exports.moveFile = moveFile;
function writeMultipleFiles(fs) {
    return Object.keys(fs)
        .reduce(function (previous, curr) {
        return previous.then(function () { return writeFile(curr, fs[curr]); });
    }, Promise.resolve());
}
exports.writeMultipleFiles = writeMultipleFiles;
function replaceInFile(filePath, match, replacement) {
    return readFile(filePath)
        .then(function (content) { return writeFile(filePath, content.replace(match, replacement)); });
}
exports.replaceInFile = replaceInFile;
function expectFileToExist(fileName) {
    return new Promise(function (resolve, reject) {
        fs.exists(fileName, function (exist) {
            if (exist) {
                resolve();
            }
            else {
                reject(new Error("File " + fileName + " was expected to exist but not found..."));
            }
        });
    });
}
exports.expectFileToExist = expectFileToExist;
function expectFileToMatch(fileName, regEx) {
    return readFile(fileName)
        .then(function (content) {
        if (typeof regEx == 'string') {
            if (content.indexOf(regEx) == -1) {
                throw new Error("File \"" + fileName + "\" did not contain \"" + regEx + "\"...");
            }
        }
        else {
            if (!content.match(regEx)) {
                throw new Error("File \"" + fileName + "\" did not match regex " + regEx + "...");
            }
        }
    });
}
exports.expectFileToMatch = expectFileToMatch;

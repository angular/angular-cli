'use strict';

// var MockUI = require('./mock-ui');
// var MockAnalytics = require('./mock-analytics');
// var Cli = require('../../packages/angular-cli/lib/cli');
const child_process = require('child_process');
const path = require('path');


const ngBinPath = path.join(__dirname, '../../bin/ng');


module.exports = function ng(args) {
  return new Promise((resolve, reject) => {
    const childProcess = child_process.spawn(ngBinPath, args);

    childProcess.stdout.on('data', (data) => {
      process.stdout.write('STDOUT: ');
      process.stdout.write(data);
    });
    childProcess.stderr.on('data', (data) => {
      process.stdout.write('ERROR:  ');
      process.stdout.write(data);
    });
    childProcess.on('close', (code) => {
      if (code != 0) {
        reject(new Error('error'));
      } else {
        resolve();
      }
    });
  });
};

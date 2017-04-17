#!/usr/bin/env node
'use strict';

/* eslint-disable no-console */
const exec = require('child_process').exec;
const temp = require('temp');

const outputPath = temp.mkdirSync('angular-stress-tester');

function execute(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if(error) {
        reject(error);
      }
      resolve(stdout.trim())
    });
  });
}

Promise.resolve()
  .then(() => console.log('Cloning application...'))
  .then(() => execute(`git clone "https://github.com/sumitarora/angular-stress-tester" "${outputPath}"`))
  .then(() => console.log('Moving into Directory...'))
  .then(() => process.chdir(outputPath))
  .then(() => console.log(`Current Directory: ${process.cwd()}`))
  .then(() => console.log('Installing...'))
  .then(() => execute('npm install'))
  .then(() => console.log('Building...'))
  .then(() => execute('ng build --prod'))
  .then(() => console.log('Done...'))
  .catch(err => console.error(`Error:\n${err.message}`));

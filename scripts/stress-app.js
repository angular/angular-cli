#!/usr/bin/env node
'use strict';

/* eslint-disable no-console */
const exec = require('child_process').exec;
const temp = require('temp');
const pusage = require('pidusage');
const os = require('os');
const prettyBytes = require('pretty-bytes');

const metrics = {
  totalmem: os.totalmem(),
  memUtilization: {},
  cpuUtilization: 0
};

const getStats = function () {
  return new Promise((resolve, reject) => {
    metrics.memUtilization = process.memoryUsage();

    pusage.stat(process.pid, function (error, stat) {
      if (error) {
        reject(error);
      }

      metrics.cpuUtilization = stat.cpu;
      printMetrics(metrics);
      resolve(metrics);
    });
  });
};

const outputPath = temp.mkdirSync('angular-stress-tester');

function execute(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if(error) {
        reject(error);
      }
      resolve(stdout.trim());
    });
  });
}

function printMetrics(metrics) {
  console.log(` Heap Used: ${prettyBytes(metrics.memUtilization.heapUsed)}`);
  console.log(` Heap Total: ${prettyBytes(metrics.memUtilization.heapTotal)}`);
  console.log(` Total Memory: ${prettyBytes(metrics.totalmem)}`);
  console.log(` CPU Used: ${metrics.cpuUtilization}%`);
  console.log('');
}

Promise.resolve()
  .then(() => console.log('Cloning application...'))
  .then(() => execute(`git clone "https://github.com/sumitarora/angular-stress-tester" "${outputPath}"`))
  .then(() => getStats())
  .then(() => console.log('Moving into Directory...'))
  .then(() => process.chdir(outputPath))
  .then(() => getStats())
  .then(() => console.log(`Current Directory: ${process.cwd()}`))
  .then(() => console.log('Installing...'))
  .then(() => execute('npm install'))
  .then(() => getStats())
  .then(() => console.log('Building...'))
  .then(() => execute('ng build --prod'))
  .then(() => getStats())
  .then(() => console.log('Done...'))
  .catch(err => console.error(`Error:\n${err.message}`));

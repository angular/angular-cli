#!/usr/bin/env node
'use strict';

/* eslint-disable no-console */
const spawn = require( 'child_process').spawnSync;
const fs = require('fs');
const temp = require('temp');
const chalk = require('chalk');

const outputPath = temp.mkdirSync('angular-cli-builds');
const cli = 'https://github.com/angular/angular-cli.git';
const cliBuilds = 'https://github.com/angular/cli-builds.git';
const ngToolsWebpackBuilds = 'https://github.com/angular/ngtools-webpack-builds.git';

function execute(command, cwd, ...args) {
  return new Promise((resolve, reject) => {
    const runCommand = spawn(command, args, { cwd });
    if (runCommand.status === 0) {
      console.log(chalk.gray(runCommand.output.toString()));
      resolve(runCommand.output.toString());
    } else {
      reject({ message: runCommand.error || runCommand.stdout.toString() || runCommand.stderr.toString() });
    }
  });
}

function printMessage(message) {
  console.log(chalk.green(`${message}\r\n`));
}

function updateDependencyPath(path, commitMessage) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf-8', (readError, data) => {
      if (readError) {
        reject(readError);
      } else {
        let packageJSON = JSON.parse(data);
        packageJSON.dependencies['@ngtools/webpack'] = `${ngToolsWebpackBuilds}#${commitMessage.substr(1, 7)}`;
        fs.writeFile(path, JSON.stringify(packageJSON, null, 2), (writeError, updatedFile) => {
          if (writeError) {
            reject(writeError);
          } else {
            resolve(updatedFile);
          }
        });
      }
    });
  });
}

function updateVersion(path, commitMessage) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf-8', (readError, data) => {
      if (readError) {
        reject(readError);
      } else {
        let packageJSON = JSON.parse(data);
        packageJSON.version = packageJSON.version + '-' + commitMessage.substr(1, 7);
        fs.writeFile(path, JSON.stringify(packageJSON, null, 2), (writeError, updatedFile) => {
          if (writeError) {
            reject(writeError);
          } else {
            resolve(updatedFile);
          }
        });
      }
    });
  });
}

function getCommitMessage(path) {
  return execute('git', path, 'log', '--format=%h %s', '-n', 1)
    .then(data => {
      return data;
    });
}

Promise.resolve()
  .then(() => process.chdir(outputPath))
  .then(() => console.log(process.cwd()))
  .then(() => printMessage('Cloning...'))
  .then(() => execute('git', process.cwd(), 'clone', cli))
  .then(() => execute('git', process.cwd(), 'clone', cliBuilds))
  .then(() => execute('git', process.cwd(), 'clone', ngToolsWebpackBuilds))
  .then(() => printMessage('Installing packages...'))
  .then(() => execute('npm', './angular-cli', 'install'))
  .then(() => printMessage('Creating build...'))
  .then(() => execute('npm', './angular-cli', 'run', 'build'))
   //---------------------------- ngtools-webpack-builds ----------------------//
  .then(() => printMessage('Copying ngtools-webpack-builds dist....'))
  .then(() => execute('cp', './ngtools-webpack-builds', '-a', './../angular-cli/dist/@ngtools/webpack/.', '.'))
  .then(() => printMessage('Updating package.json'))
  .then(() => getCommitMessage('./angular-cli'))
  .then((message) => updateVersion('./ngtools-webpack-builds/package.json', message))
  .then(() => execute('git', './ngtools-webpack-builds', 'add', '-A'))
  .then(() => getCommitMessage('./angular-cli'))
  .then((message) => execute('git', './ngtools-webpack-builds', 'commit', '-am', message.substr(1)))
  // Update the credentials using the GITHUB TOKEN.
  .then(() => execute('git', './ngtools-webpack-builds', 'config', 'credential.helper',
    'store', '--file=.git/credentials'))
  .then(() => fs.writeFileSync('./ngtools-webpack-builds/.git/credentials',
    `https://${process.env['GITHUB_ACCESS_TOKEN']}@github.com`))
  .then(() => execute('git', './ngtools-webpack-builds', 'push'))
  //---------------------------- cli-builds ----------------------------------//
  .then(() => printMessage('Copying cli-builds dist....'))
  .then(() => execute('cp', './cli-builds', '-a', './../angular-cli/dist/@angular/cli/.', '.'))
  .then(() => printMessage('Updating package.json'))
  .then(() => getCommitMessage('./angular-cli'))
  .then((message) => updateVersion('./cli-builds/package.json', message))
  .then(() => getCommitMessage('./ngtools-webpack-builds'))
  .then((message) => updateDependencyPath('./cli-builds/package.json', message))
  .then(() => execute('git', './cli-builds', 'add', '-A'))
  .then(() => getCommitMessage('./angular-cli'))
  .then((message) => execute('git', './cli-builds', 'commit', '-am', message.substr(1)))
  // Update the credentials using the GITHUB TOKEN.
  .then(() => execute('git', './cli-builds', 'config', 'credential.helper',
      'store', '--file=.git/credentials'))
  .then(() => fs.writeFileSync('./cli-builds/.git/credentials',
      `https://${process.env['GITHUB_ACCESS_TOKEN']}@github.com`))
  .then(() => execute('git', './cli-builds', 'push'))
  //---------------------------- done ----------------------------------------//
  .then(() => console.log('Done...'))
  .catch(err => console.error(`Error:\n${err.message}`));

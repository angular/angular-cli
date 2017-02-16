#!/usr/bin/env node
'use strict';

/* eslint-disable no-console */
const fs = require('fs-extra');
const path = require('path');
const util = require('util');
const exec = require('child_process').exec;
const version = require('../../package.json').version;

const documentationPath = './docs/documentation';
const outputPath = '/tmp/documentation/';

function createTempDirectory() {
  return new Promise((resolve, reject) => {
    fs.emptyDir(outputPath, (error) => {
      if (error) {
        reject(error);
      }
      resolve();
    })
  });
}

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

function gitClone(url, directory)  {
  return execute(util.format('git clone %s %s', url, directory));
}

function readFiles(directory, filelist) {
  if(directory[directory.length - 1] != '/') {
    directory = directory.concat('/');
  }

  const files = fs.readdirSync(directory);
  filelist = filelist || [];
  files.forEach((file) => {
    if (fs.statSync(directory + file).isDirectory()) {
      filelist = readFiles(directory + file + '/', filelist);
    } else {
      const originalPath = directory + file;
      const newPath = outputPath + originalPath
        .replace(documentationPath + '/', '')
        .replace('/', '-');
      filelist.push({
        originalPath,
        newPath
      });
    }
  });
  return filelist;
}

function copyFile(from, to, linksToReplace) {
  from = path.relative(process.cwd(), from);
  to = path.relative(process.cwd(), to);
  const replaceHyphen = new RegExp('-', 'gi');
  return new Promise((resolve, reject) => {
    fs.readFile(from, (error, data) => {
      if (error) {
        reject(error);
      }
      let fileData = data.toString();
      linksToReplace.forEach((link) => {
        const str = '\\(' + link.oldName.replace(replaceHyphen, '\\-') + '\\)';
        const r = new RegExp(str, 'gi');
        fileData = fileData.replace(r, link.newName);
      });
      fs.outputFile(to, fileData, (error2) => {
        if (error2) {
          reject(error2);
        }
        resolve();
      })
    })
  });
}

function createFiles() {
  const files = readFiles(documentationPath) || [];
  const linksToReplace = checkNameLinks(files);
  const copies = files.map(({ originalPath, newPath }) => copyFile(originalPath, newPath, linksToReplace));
  return Promise.all(copies);
}

function checkNameLinks(files) {
  return files.reduce((pValue, cValue) => {
    const oldName = cValue.originalPath.split('/').slice(-1).pop().replace('.md', '');
    const newName = '(' + cValue.newPath.split('/').slice(-1).pop().replace('.md', '') + ')';
    if (oldName !== newName) {
      pValue.push({
        oldName,
        newName
      });
    }
    return pValue;
  }, []);
}

(function() {
  Promise.resolve()
    .then(() => createTempDirectory())
    .then(() => gitClone('https://github.com/angular/angular-cli.wiki', outputPath))
    .then(() => createFiles())
    .then(() => process.chdir(outputPath))
    .then(() => execute('git add .'))
    .then(() => execute(`git commit -m ${version}`))
    .then(() => execute('git status'))
    .then((data) => {
      console.log(data);
    })
    .catch((error) => {
      console.log('error', error);
    })
})();
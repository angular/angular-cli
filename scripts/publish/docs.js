#!/usr/bin/env node
'use strict';

/* eslint-disable no-console */
const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');
const temp = require('temp');
const version = require('../../package.json').version;

const documentationPath = path.join(__dirname, '../../docs/documentation');
const outputPath = temp.mkdirSync('angular-cli-docs');


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

function readFiles(directory, filelist) {
  if(directory[directory.length - 1] != `${path.sep}`) {
    directory = directory.concat(`${path.sep}`);
  }

  const files = fs.readdirSync(directory);
  filelist = filelist || [];
  files.forEach((file) => {
    if (fs.statSync(directory + file).isDirectory()) {
      filelist = readFiles(directory + file + `${path.sep}`, filelist);
    } else {
      const originalPath = directory + file;
      const newPath = path.join(outputPath, originalPath
        .replace(documentationPath + `${path.sep}`, '')
        .replace(`${path.sep}`, '-'));

      filelist.push({ originalPath, newPath });
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
      fs.writeFile(to, fileData, (error2) => {
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
  const copies = files.map(({ originalPath, newPath }) => {
    return copyFile(originalPath, newPath, linksToReplace)
  });
  return Promise.all(copies);
}

function checkNameLinks(files) {
  return files.reduce((pValue, cValue) => {
    const oldName = cValue.originalPath
        .replace(documentationPath + `${path.sep}`, '')
        .replace('.md', '')
        .replace(`${path.sep}`, '/')
    const newName = '(' + cValue.newPath.split(`${path.sep}`).slice(-1).pop().replace('.md', '') + ')';
    if (oldName !== newName) {
      pValue.push({
        oldName,
        newName
      });
    }
    return pValue;
  }, []);
}

Promise.resolve()
  .then(() => console.log(`Documentation Path: ${documentationPath}`))
  .then(() => console.log(`Wiki path: ${outputPath}`))
  .then(() => console.log('Cloning...'))
  .then(() => execute(`git clone "https://github.com/angular/angular-cli.wiki" "${outputPath}"`))
  .then(() => console.log('Copying Files...'))
  .then(() => createFiles())
  .then(() => process.chdir(outputPath))
  .then(() => console.log('Committing...'))
  .then(() => execute('git add .'))
  .then(() => execute(`git commit -m "${version}"`))
  .then(() => execute('git push'))
  .then(() => console.log('Done...'))
  .catch(err => console.error(`Error:\n${err.message}`));

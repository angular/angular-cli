/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable: no-console
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { packages } from '../lib/packages';

const temp = require('temp');

function die(message = 'Unknown error.') {
  throw new Error(message);
}

const version = packages['@angular/cli'].version || die('Cannot find @angular/cli.');

const docsRoot = path.join(__dirname, '../docs/documentation');
const outputPath = temp.mkdirSync('angular-cli-docs');

// Execute a process and returns its stdout.
function execute(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) {
        reject(error);
      }

      resolve(stdout.trim());
    });
  });
}

// List all files in a directory.
function listAllFiles(directory: string) {
  const list: string[] = [];

  function _listRecurse(p: string) {
    const files = fs.readdirSync(path.join(directory, p));
    files.forEach(name => {
      const fileName = path.join(p, name);
      const stat = fs.statSync(path.join(directory, fileName));

      if (stat.isDirectory()) {
        _listRecurse(fileName);
      } else {
        list.push(fileName);
      }
    });
  }
  _listRecurse('');

  return list;
}

export default async function() {
  console.log(`Documentation Path: ${docsRoot}`);
  console.log(`Wiki path: ${outputPath}`);

  console.log('Cloning...');
  await execute(`git clone "https://github.com/angular/angular-cli.wiki" "${outputPath}"`);

  console.log('Listing all files...');
  const allFiles = listAllFiles(docsRoot);
  const allFilesInfo = allFiles.map(fileName => {
    const wikiFileName = fileName.split(path.sep).join('-');
    const src = path.join(docsRoot, fileName);
    const dest = path.join(outputPath, wikiFileName);

    return { fileName, wikiFileName, src, dest };
  });

  // For each files, read its content, replace all links from 'a/b/c.md' to 'a-b-c' and write it.
  allFilesInfo.forEach(({ src, dest }) => {
    let content = fs.readFileSync(src, 'utf-8');

    content = allFilesInfo.reduce((acc, { fileName, wikiFileName }) => {
      const replace = fileName.replace(/\.md$/, '');
      const replaceWith = wikiFileName.replace(/\.md$/, '');

      const text = replace.replace(/[\-\[\]{}()+?.^$|]/g, '\\$&');

      return acc.replace(new RegExp(text, 'g'), replaceWith);
    }, content);

    fs.writeFileSync(dest, content);
  });
  console.log(`Done ${allFiles.length} files...`);

  process.chdir(outputPath);
  console.log('Committing...');
  await execute('git add .');
  await execute(`git commit -m "${version}"`);
  await execute('git push');

  console.log('Done');
}

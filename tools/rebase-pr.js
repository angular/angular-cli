/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

 // tslint:disable:no-console
// ** IMPORTANT **
// This script cannot use external dependencies because it needs to run before they are installed.

const util = require('util');
const https = require('https');
const child_process = require('child_process');
const exec = util.promisify(child_process.exec);

function determineTargetBranch(repository, prNumber) {
  const pullsUrl = `https://api.github.com/repos/${repository}/pulls/${prNumber}`;
  // GitHub requires a user agent: https://developer.github.com/v3/#user-agent-required
  const options = { headers: { 'User-Agent': repository } };

  return new Promise((resolve, reject) => {
    https.get(pullsUrl, options, (res) => {
      const { statusCode } = res;
      const contentType = res.headers['content-type'];

      let error;
      if (statusCode !== 200) {
        error = new Error(`Request Failed.\nStatus Code: ${statusCode}.\nResponse: ${res}.\n' +`);
      } else if (!/^application\/json/.test(contentType)) {
        error = new Error('Invalid content-type.\n' +
          `Expected application/json but received ${contentType}`);
      }
      if (error) {
        reject(error);
        res.resume();
        return;
      }

      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData);
          resolve(parsedData['base']['ref']);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (e) => {
      reject(e);
    });
  });
}

if (process.argv.length != 4) {
  console.error(`This script requires the GitHub repository and PR number as arguments.`);
  console.error(`Example: node scripts/rebase-pr.js angular/angular 123`);
  process.exitCode = 1;
  return;
}

const repository = process.argv[2];
const prNumber = process.argv[3];
let targetBranch;


return Promise.resolve()
  .then(() => {
    console.log(`Determining target branch for PR ${prNumber} on ${repository}.`);
    return determineTargetBranch(repository, prNumber);
  })
  .then(target => {
    targetBranch = target;
    console.log(`Target branch is ${targetBranch}.`);
  })
  .then(() => {
    console.log(`Fetching ${targetBranch} from origin.`);
    return exec(`git fetch origin ${targetBranch}`);
  })
  .then(target => {
    console.log(`Rebasing current branch on ${targetBranch}.`);
    return exec(`git rebase origin/${targetBranch}`);
  })
  .then(() => console.log('Rebase successfull.'))
  .catch(err => {
    console.log('Failed to rebase on top or target branch.\n');
    console.error(err);
    process.exitCode = 1;
  });
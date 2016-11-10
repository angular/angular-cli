import * as denodeify from 'denodeify';
const Task = require('../ember-cli/lib/models/task');
const SilentError = require('silent-error');
import { exec } from 'child_process';
import * as https from 'https';
import { oneLine } from 'common-tags';


export default Task.extend({
  run: function(commandOptions: any) {
    const ui = this.ui;
    let promise: Promise<any>;

    // declared here so that tests can stub exec
    const execPromise = denodeify(exec);

    if (/.+/.test(commandOptions.ghToken) && /\w+/.test(commandOptions.ghUsername)) {
      promise = Promise.resolve({
        ghToken: commandOptions.ghToken,
        ghUsername: commandOptions.ghUsername
      });
    } else {
      ui.writeLine();
      ui.writeLine(oneLine`
        In order to deploy this project via GitHub Pages, we must first create a repository for it.
      `);
      ui.writeLine(oneLine`
        It\'s safer to use a token than to use a password so you will need to create one
      `);
      ui.writeLine('Go to the following page and click "Generate new token".');
      ui.writeLine('https://github.com/settings/tokens\n');
      ui.writeLine('Choose "public_repo" as scope and then click "Generate token".\n');
      promise = ui.prompt([
        {
          name: 'ghToken',
          type: 'input',
          message: oneLine`
            Please enter GitHub token you just created
            (used only once to create the repo):
          `,
          validate: function(token: string) {
            return /.+/.test(token);
          }
        }, {
          name: 'ghUsername',
          type: 'input',
          message: 'and your GitHub user name:',
          validate: function(userName: string) {
            return /\w+/.test(userName);
          }
        }]);
    }

    return promise
      .then((answers) => {
      return new Promise(function(resolve, reject) {
        const postData = JSON.stringify({
          'name': commandOptions.projectName
        });

        const req = https.request({
          hostname: 'api.github.com',
          port: 443,
          path: '/user/repos',
          method: 'POST',
          headers: {
            'Authorization': `token ${answers.ghToken}`,
            'Content-Type': 'application/json',
            'Content-Length': postData.length,
            'User-Agent': 'angular-cli-github-pages'
          }
        });

        req.on('response', function(response: any) {
          if (response.statusCode === 201) {
            resolve(execPromise(oneLine`
              git remote add origin 
              git@github.com:${answers.ghUsername}/${commandOptions.projectName}.git
            `));
          } else {
            reject(new SilentError(oneLine`
              Failed to create GitHub repo. Error: ${response.statusCode} ${response.statusMessage}
            `));
          }
        });

        req.write(postData);
        req.end();
      });
    });
  }
});

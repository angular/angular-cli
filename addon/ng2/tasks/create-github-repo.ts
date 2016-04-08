import * as Promise from 'ember-cli/lib/ext/promise';
import * as Task from 'ember-cli/lib/models/task';
import * as SilentError from 'silent-error';
import { exec } from 'child_process';
import * as https from 'https';

module.exports = Task.extend({
  run: function(commandOptions) {
    var ui = this.ui;
    let promise;

    // declared here so that tests can stub exec
    const execPromise = Promise.denodeify(exec);

    if (/.+/.test(commandOptions.ghToken) && /\w+/.test(commandOptions.ghUsername)) {
      promise = Promise.resolve({
        ghToken: commandOptions.ghToken,
        ghUsername: commandOptions.ghUsername
      });
    } else {
      ui.writeLine("\nIn order to deploy this project via GitHub Pages, we must first create a repository for it.");
      ui.writeLine("It's safer to use a token than to use a password, so you will need to create one.\n");
      ui.writeLine("Go to the following page and click 'Generate new token'.");
      ui.writeLine("https://github.com/settings/tokens\n");
      ui.writeLine("Choose 'public_repo' as scope and then click 'Generate token'.\n");
      promise = ui.prompt([
        {
          name: 'ghToken',
          type: 'input',
          message: 'Please enter GitHub token you just created (used only once to create the repo):',
          validate: function(token) {
            return /.+/.test(token);
          }
        }, {
          name: 'ghUsername',
          type: 'input',
          message: 'and your GitHub user name:',
          validate: function(userName) {
            return /\w+/.test(userName);
          }
        }]);
    }

    return promise
      .then((answers) => {
      return new Promise(function(resolve, reject) {
        var postData = JSON.stringify({
          'name': commandOptions.projectName
        });

        var req = https.request({
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

        req.on('response', function(response) {
          if (response.statusCode === 201) {
            resolve(execPromise(`git remote add origin git@github.com:${answers.ghUsername}/${commandOptions.projectName}.git`))
          } else {
            reject(new SilentError(`Failed to create GitHub repo. Error: ${response.statusCode} ${response.statusMessage}`));
          }
        });

        req.write(postData);
        req.end();
      });
    });
  }
});

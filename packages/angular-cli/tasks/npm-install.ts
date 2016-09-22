const Task = require('ember-cli/lib/models/task');
import * as chalk from 'chalk';
import {exec} from 'child_process';

function removeFromArray(array: any[], item: any) {
  const itemIndex = array.indexOf(item);
  if (itemIndex !== -1) {
    array.splice(itemIndex, 1);
  }
}

export default Task.extend({
  run: function() {
    const ui = this.ui;
    let PATH: string;

    return new Promise(function(resolve, reject) {
      ui.writeLine(chalk.green('Installing packages for tooling via npm.'));
      // remove from PATH:
      // - absolute path to projet's node_modules
      // - relative path to projet's node_modules (linux and windows)
      exec('npm bin', (err: NodeJS.ErrnoException, stdout: string, stderr: string) => {
            if (err) {
              ui.writeLine(stderr);
              ui.writeLine(chalk.red('Package install failed, see above.'));
              reject();
            } else {
              const absoluteProjectNodeModulesPath = stdout.replace(/(\r|\n)/, '');
              const pathArr = process.env.PATH.split(':');
              removeFromArray(pathArr, absoluteProjectNodeModulesPath);
              removeFromArray(pathArr, 'node_modules/.bin');
              removeFromArray(pathArr, 'node_modules\.bin');
              PATH = pathArr.join(':');
              resolve();
            }
      });
    })
    .then(() => {
      return new Promise(function(resolve, reject) {
        const options = {
          env: {
            PATH: PATH
          }
        };
        exec(
          'npm install',
          options,
          (err: NodeJS.ErrnoException, stdout: string, stderr: string) => {
          if (err) {
            ui.writeLine(stderr);
            ui.writeLine(chalk.red('Package install failed, see above.'));
            reject();
          } else {
            ui.writeLine(chalk.green('Installed packages for tooling via npm.'));
            resolve();
          }
        });
      });
    });
  }
});

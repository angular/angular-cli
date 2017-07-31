import * as chalk from 'chalk';
import {exec} from 'child_process';
import {CliConfig} from '../models/config';
import denodeify = require('denodeify');

const execPromise = denodeify(exec);
const packageManager = CliConfig.fromGlobal().get('packageManager');


export function checkYarnOrCNPM() {

  // Don't show messages if user has already changed the default.
  if (packageManager !== 'default') {
    return Promise.resolve();
  }

  return Promise
      .all([checkYarn(), checkCNPM()])
      .then((data: Array<boolean>) => {
        const [isYarnInstalled, isCNPMInstalled] = data;
        if (isYarnInstalled && isCNPMInstalled) {
          console.log(chalk.yellow('You can `ng set --global packageManager=yarn` '
            + 'or `ng set --global packageManager=cnpm`.'));
        } else if (isYarnInstalled) {
          console.log(chalk.yellow('You can `ng set --global packageManager=yarn`.'));
        } else if (isCNPMInstalled) {
          console.log(chalk.yellow('You can `ng set --global packageManager=cnpm`.'));
        } else  {
          if (packageManager !== 'default' && packageManager !== 'npm') {
            console.log(chalk.yellow(`Seems that ${packageManager} is not installed.`));
            console.log(chalk.yellow('You can `ng set --global packageManager=npm`.'));
          }
        }
      });
}

function checkYarn() {
  return execPromise('yarn --version')
    .then(() => true, () => false);
}

function checkCNPM() {
  return execPromise('cnpm --version')
    .then(() => true, () => false);
}

const Task = require('../ember-cli/lib/models/task');
import { CliConfig } from '../models/config';
import { CliConfig as ConfigInterface } from '../lib/config/schema';
import { timeToCheck, newVersionAvailable, CheckResult } from '../update/check';
import { oneLine } from 'common-tags';
import * as chalk from 'chalk';

export interface VersionCheckTaskOptions {
  forceCheck: boolean;
  includeUnstable: boolean;
}

export default Task.extend({
  run: function(options: VersionCheckTaskOptions) {
    const globalConfigManager = CliConfig.fromGlobal();
    const globalConfig = globalConfigManager.config;
    const lastChecked = getLastChecked(globalConfig, this.project.root);
    const frequency = getFrequency(globalConfig);

    const isTimeToCheck = timeToCheck(lastChecked, frequency);
    if (isTimeToCheck) {
      updateLastChecked(globalConfigManager, this.project.root);
    }

    if (options.forceCheck || isTimeToCheck) {
      const rootDir = '';
      const packageName = '@angular/cli';
      return newVersionAvailable(rootDir, packageName, options)
        .then((result: CheckResult) => {
          const newVersionAvailable = !!result.newVersion;
          if (newVersionAvailable) {
            this.ui.writeLine(chalk.yellow(oneLine`A newer version of Angular CLI is available
              (${result.currentVersion} -> ${result.newVersion})
              Run npm install --save[-dev] @angular/cli to update version.`));
          }
          return newVersionAvailable;
        })
        .catch(() => {}); // Ignore version check failures.
    }
  }
});

function getLastChecked(config: ConfigInterface, rootDir: string): Date {
  let lastChecked;
  if (config && config.update && config.update.lastChecked) {
    lastChecked = config.update.lastChecked[encodePath(rootDir)];
    if (lastChecked) {
      lastChecked = new Date(lastChecked);
    }
  }
  return lastChecked || new Date(0);
}

function updateLastChecked(config: CliConfig, rootDir: string): void {
  const now = (new Date()).toISOString();
  if (!config.get('update')) {
    config.set('update', {});
  }
  if (!config.get('update.lastChecked')) {
    config.set('update.lastChecked', {});
  }
  config.set(`update.lastChecked.${encodePath(rootDir)}`, now);
  config.save();
}

function encodePath(path: string): string {
  return path.replace(/\./g, '|');
}

function getFrequency(config: ConfigInterface): string {
  let frequency;
  if (config && config.update) {
    frequency = config.update.checkFrequency;
  }
  return frequency || '1d';
}

const SilentError = require('silent-error');
const chalk = require('chalk');

import { oneLine } from 'common-tags';
import { CliConfig } from '../models/config';

export function getAppFromConfig(nameOrIndex?: String) {
  const apps: any[] = CliConfig.getValue('apps');
  if (!apps) {
    throw new SilentError(chalk.red('Unable to find any apps in `.angular-cli.json`.'));
  }

  if (nameOrIndex) {
    if (nameOrIndex.match(/^[0-9]+$/)) {
      const index = parseInt(nameOrIndex.toString(), 10);
      if (apps[index]) {
        return apps[index];
      }
    } else {
      const filtered = apps.filter((currentApp: any) => currentApp.name === nameOrIndex);
      if (filtered.length > 0) {
        return filtered[0];
      }
    }
  } else {
    return apps[0];
  }
  throw new SilentError(chalk.red(oneLine`
    Unable to find app with name or index.
    Verify the configuration in \`.angular-cli.json\`
  `));
}

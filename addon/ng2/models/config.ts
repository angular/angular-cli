import {CliConfig as CliConfigBase} from './config/config';
import {CliConfig as ConfigInterface} from '../../../lib/config/schema';
import { oneLine } from 'common-tags';
import * as chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

export const CLI_CONFIG_FILE_NAME = 'angular-cli.json';


function _findUp(name: string, from: string) {
  let currentDir = from;
  while (currentDir && currentDir !== path.parse(currentDir).root) {
    const p = path.join(currentDir, name);
    if (fs.existsSync(p)) {
      return p;
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}


function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}


export class CliConfig extends CliConfigBase<ConfigInterface> {
  private static _configFilePath(projectPath?: string): string {
    // Find the configuration, either where specified, in the angular-cli project
    // (if it's in node_modules) or from the current process.
    return (projectPath && _findUp(CLI_CONFIG_FILE_NAME, projectPath))
        || _findUp(CLI_CONFIG_FILE_NAME, process.cwd())
        || _findUp(CLI_CONFIG_FILE_NAME, __dirname);
  }


  static fromProject(): CliConfig {
    const configPath = this._configFilePath();
    const globalConfigPath = path.join(getUserHome(), CLI_CONFIG_FILE_NAME);

    if (!configPath) {
      return {};
    }

    const cliConfig = CliConfigBase.fromConfigPath(CliConfig._configFilePath(), [globalConfigPath]);
    if (cliConfig.alias('apps.0.root', 'defaults.sourceDir')
        + cliConfig.alias('apps.0.prefix', 'defaults.prefix')) {
      console.error(chalk.yellow(oneLine`
        The "defaults.prefix" and "defaults.sourceDir" properties of angular-cli.json
        are deprecated in favor of "apps[0].root" and "apps[0].prefix".\n
        Please update in order to avoid errors in future versions of angular-cli.
      `));
    }

    return cliConfig as CliConfig;
  }
}

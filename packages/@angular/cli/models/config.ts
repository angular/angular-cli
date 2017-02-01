import {CliConfig as CliConfigBase} from './config/config';
import {CliConfig as ConfigInterface} from '../lib/config/schema';
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

    const nodeModuleP = path.join(currentDir, 'node_modules');
    if (fs.existsSync(nodeModuleP)) {
      return null;
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}


function getUserHome() {
  return process.env[(process.platform.startsWith('win')) ? 'USERPROFILE' : 'HOME'];
}


export class CliConfig extends CliConfigBase<ConfigInterface> {
  static configFilePath(projectPath?: string): string {
    // Find the configuration, either where specified, in the angular-cli project
    // (if it's in node_modules) or from the current process.
    return (projectPath && _findUp(CLI_CONFIG_FILE_NAME, projectPath))
        || _findUp(CLI_CONFIG_FILE_NAME, process.cwd())
        || _findUp(CLI_CONFIG_FILE_NAME, __dirname);
  }

  static fromGlobal(): CliConfig {
    const globalConfigPath = path.join(getUserHome(), CLI_CONFIG_FILE_NAME);

    const cliConfig = CliConfigBase.fromConfigPath<ConfigInterface>(globalConfigPath);

    const aliases = [
      cliConfig.alias('apps.0.root', 'defaults.sourceDir'),
      cliConfig.alias('apps.0.prefix', 'defaults.prefix')
    ];

    // If any of them returned true, output a deprecation warning.
    if (aliases.some(x => !!x)) {
      console.error(chalk.yellow(oneLine`
        The "defaults.prefix" and "defaults.sourceDir" properties of angular-cli.json
        are deprecated in favor of "apps[0].root" and "apps[0].prefix".\n
        Please update in order to avoid errors in future versions of angular-cli.
      `));
    }

    return cliConfig;
  }

  static fromProject(): CliConfig {
    const configPath = this.configFilePath();
    const globalConfigPath = path.join(getUserHome(), CLI_CONFIG_FILE_NAME);

    if (!configPath) {
      return null;
    }

    const cliConfig = CliConfigBase.fromConfigPath<ConfigInterface>(
      CliConfig.configFilePath(), [globalConfigPath]);

    const aliases = [
      cliConfig.alias('apps.0.root', 'defaults.sourceDir'),
      cliConfig.alias('apps.0.prefix', 'defaults.prefix')
    ];

    // If any of them returned true, output a deprecation warning.
    if (aliases.some(x => !!x)) {
      console.error(chalk.yellow(oneLine`
        The "defaults.prefix" and "defaults.sourceDir" properties of angular-cli.json
        are deprecated in favor of "apps[0].root" and "apps[0].prefix".\n
        Please update in order to avoid errors in future versions of angular-cli.
      `));
    }

    return cliConfig as CliConfig;
  }
}

import {CliConfig as CliConfigBase} from './config/config';
import {CliConfig as ConfigInterface} from '../lib/config/schema';
import { oneLine } from 'common-tags';
import * as chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

import {findUp} from '../utilities/find-up';


export const CLI_CONFIG_FILE_NAME = '.angular-cli.json';
const CLI_CONFIG_FILE_NAME_ALT = 'angular-cli.json';


const configCacheMap = new Map<string, CliConfigBase<ConfigInterface>>();


export class CliConfig extends CliConfigBase<ConfigInterface> {
  static configFilePath(projectPath?: string): string {
    const configNames = [CLI_CONFIG_FILE_NAME, CLI_CONFIG_FILE_NAME_ALT];
    // Find the configuration, either where specified, in the Angular CLI project
    // (if it's in node_modules) or from the current process.
    return (projectPath && findUp(configNames, projectPath))
        || findUp(configNames, process.cwd())
        || findUp(configNames, __dirname);
  }

  static getValue(jsonPath: string): any {
    let value;

    const projectConfig = CliConfig.fromProject();
    if (projectConfig) {
      value = projectConfig.get(jsonPath);
    } else if (CliConfig.globalConfigFilePath() !== CliConfig.configFilePath()) {
      const globalConfig = CliConfig.fromGlobal();
      if (globalConfig) {
        value = globalConfig.get(jsonPath);
      }
    }

    return value;
  }

  static globalConfigFilePath(): string {
    const globalConfigPath = path.join(homedir(), CLI_CONFIG_FILE_NAME);
    if (fs.existsSync(globalConfigPath)) {
      return globalConfigPath;
    }

    const altGlobalConfigPath = path.join(homedir(), CLI_CONFIG_FILE_NAME_ALT);
    if (fs.existsSync(altGlobalConfigPath)) {
      return altGlobalConfigPath;
    }

    return globalConfigPath;
  }

  static fromGlobal(): CliConfig {
    const globalConfigPath = this.globalConfigFilePath();

    if (configCacheMap.has(globalConfigPath)) {
      return configCacheMap.get(globalConfigPath);
    }

    const cliConfig = CliConfigBase.fromConfigPath<ConfigInterface>(globalConfigPath);

    CliConfig.addAliases(cliConfig);
    configCacheMap.set(globalConfigPath, cliConfig);
    return cliConfig;
  }

  static fromProject(projectPath?: string): CliConfig {
    const configPath = this.configFilePath(projectPath);

    if (!configPath ||
     (configPath === this.globalConfigFilePath() && process.cwd() !== path.dirname(configPath))) {
        return null;
    }
    if (configCacheMap.has(configPath)) {
      return configCacheMap.get(configPath);
    }

    const globalConfigPath = CliConfig.globalConfigFilePath();
    const cliConfig = CliConfigBase.fromConfigPath<ConfigInterface>(configPath, [globalConfigPath]);

    CliConfig.addAliases(cliConfig);
    configCacheMap.set(configPath, cliConfig);
    return cliConfig as CliConfig;
  }

  static addAliases(cliConfig: CliConfigBase<ConfigInterface>) {

    // Aliases with deprecation messages.
    const aliases = [
      cliConfig.alias('apps.0.root', 'defaults.sourceDir'),
      cliConfig.alias('apps.0.prefix', 'defaults.prefix')
    ];

    // If any of them returned true, output a deprecation warning.
    if (aliases.some(x => x)) {
      console.error(chalk.yellow(oneLine`
        The "defaults.prefix" and "defaults.sourceDir" properties of .angular-cli.json
        are deprecated in favor of "apps[0].root" and "apps[0].prefix".\n
        Please update in order to avoid errors in future versions of Angular CLI.
      `));
    }

    // Additional aliases which do not emit any messages.
    cliConfig.alias('defaults.interface.prefix', 'defaults.inline.prefixInterfaces');
    cliConfig.alias('defaults.component.inlineStyle', 'defaults.inline.style');
    cliConfig.alias('defaults.component.inlineTemplate', 'defaults.inline.template');
    cliConfig.alias('defaults.component.spec', 'defaults.spec.component');
    cliConfig.alias('defaults.class.spec', 'defaults.spec.class');
    cliConfig.alias('defaults.component.directive', 'defaults.spec.directive');
    cliConfig.alias('defaults.component.module', 'defaults.spec.module');
    cliConfig.alias('defaults.component.pipe', 'defaults.spec.pipe');
    cliConfig.alias('defaults.component.service', 'defaults.spec.service');
    cliConfig.alias('defaults.build.poll', 'defaults.poll');
  }
}

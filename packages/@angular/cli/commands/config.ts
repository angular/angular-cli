import { Command } from '../models/command';
import * as fs from 'fs';
import { CliConfig } from '../models/config';
import { oneLine } from 'common-tags';

const SilentError = require('silent-error');


export interface ConfigOptions {
  jsonPath: string;
  value?: string;
  global?: boolean;
}

export default class ConfigCommand extends Command {
  public readonly name = 'config';
  public readonly description = 'Get/set configuration values.';
  public readonly arguments = ['jsonPath', 'value'];
  public readonly options = [
    {
      name: 'global',
      type: Boolean,
      'default': false,
      aliases: ['g'],
      description: 'Get/set the value in the global configuration (in your home directory).'
    }
  ];

  public run(options: ConfigOptions) {
    const config = options.global ? CliConfig.fromGlobal() : CliConfig.fromProject();

    if (config === null) {
      throw new SilentError('No config found. If you want to use global configuration, '
        + 'you need the --global argument.');
    }

    const action = !!options.value ? 'set' : 'get';

    if (action === 'get') {
      this.get(config, options);
    } else {
      this.set(config, options);
    }
  }

  private get(config: CliConfig, options: ConfigOptions) {
    const value = config.get(options.jsonPath);

    if (value === null || value === undefined) {
      throw new SilentError('Value cannot be found.');
    } else if (typeof value == 'object') {
      this.logger.info(JSON.stringify(value, null, 2));
    } else {
      this.logger.info(value.toString());
    }
  }

  private set(config: CliConfig, options: ConfigOptions) {
    const type = config.typeOf(options.jsonPath);
      let value: any = options.value;
      switch (type) {
        case 'boolean': value = this.asBoolean(options.value); break;
        case 'number': value = this.asNumber(options.value); break;
        case 'string': value = options.value; break;

        default: value = this.parseValue(options.value, options.jsonPath);
      }

      if (options.jsonPath.endsWith('.prefix')) {
        // update tslint if prefix is updated
        this.updateLintForPrefix(this.project.root + '/tslint.json', value);
      }

      try {
        config.set(options.jsonPath, value);
        config.save();
      } catch (error) {
        throw new SilentError(error.message);
      }
  }

  private asBoolean(raw: string): boolean {
    if (raw == 'true' || raw == '1') {
      return true;
    } else if (raw == 'false' || raw == '' || raw == '0') {
      return false;
    } else {
      throw new SilentError(`Invalid boolean value: "${raw}"`);
    }
  }

  private asNumber(raw: string): number {
    const val = Number(raw);
    if (Number.isNaN(val)) {
      throw new SilentError(`Invalid number value: "${raw}"`);
    }
    return val;
  }

  private parseValue(rawValue: string, path: string) {
    try {
      return JSON.parse(rawValue);
    } catch (error) {
      throw new SilentError(`No node found at path ${path}`);
    }
  }

  private updateLintForPrefix(filePath: string, prefix: string): void {
    if (!fs.existsSync(filePath)) {
      return;
    }

    const tsLint = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (Array.isArray(tsLint.rules['component-selector'][2])) {
      tsLint.rules['component-selector'][2].push(prefix);
    } else {
      tsLint.rules['component-selector'][2] = prefix;
    }

    if (Array.isArray(tsLint.rules['directive-selector'][2])) {
      tsLint.rules['directive-selector'][2].push(prefix);
    } else {
      tsLint.rules['directive-selector'][2] = prefix;
    }

    fs.writeFileSync(filePath, JSON.stringify(tsLint, null, 2));

    this.logger.warn(oneLine`
      tslint configuration updated to match new prefix,
      you may need to fix any linting errors.
    `);
  }
}

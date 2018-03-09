import { Command } from '../models/command';
import * as fs from 'fs';
import { CliConfig } from '../models/config';
import { oneLine } from 'common-tags';

const SilentError = require('silent-error');

export interface SetOptions {
  jsonPath: string;
  value: string;
  global?: boolean;
}


export default class SetCommand extends Command {
  public readonly name = 'set';
  public readonly description = 'Set a value in the configuration.';
  public static aliases = ['jsonPath'];
  public readonly arguments = ['jsonPath', 'value'];
  public readonly options = [
    {
      name: 'global',
      type: Boolean,
      'default': false,
      aliases: ['g'],
      description: 'Set the value in the global configuration rather than in your project\'s.'
    }];


  public run(options: SetOptions) {
    return new Promise<void>(resolve => {
      const config = options.global ? CliConfig.fromGlobal() : CliConfig.fromProject();
      if (config === null) {
        throw new SilentError('No config found. If you want to use global configuration, '
          + 'you need the --global argument.');
      }

      if (options.value === undefined && options.jsonPath.indexOf('=') !== -1) {
        [options.jsonPath, options.value] = options.jsonPath.split('=', 2);
      }

      if (options.value === undefined) {
        throw new SilentError('Must specify a value.');
      }

      const type = config.typeOf(options.jsonPath);
      let value: any = options.value;
      switch (type) {
        case 'boolean': value = this.asBoolean(options.value); break;
        case 'number': value = this.asNumber(options.value); break;
        case 'string': value = options.value; break;

        default: value = this.parseValue(options.value, options.jsonPath);
      }

      if (options.jsonPath.indexOf('prefix') > 0) {
        // update tslint if prefix is updated
        this.updateLintForPrefix(this.project.root + '/tslint.json', value);
      }

      try {
        config.set(options.jsonPath, value);
        config.save();
      } catch (error) {
        throw new SilentError(error.message);
      }
      resolve();
    });
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
    if (Number.isNaN(+raw)) {
      throw new SilentError(`Invalid number value: "${raw}"`);
    }
    return +raw;
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

    const componentLint = tsLint.rules['component-selector'][2];
    if (componentLint instanceof Array) {
      tsLint.rules['component-selector'][2].push(prefix);
    } else {
      tsLint.rules['component-selector'][2] = prefix;
    }

    const directiveLint = tsLint.rules['directive-selector'][2];
    if (directiveLint instanceof Array) {
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

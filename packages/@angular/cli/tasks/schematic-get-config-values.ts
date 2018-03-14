import { Option } from '../models/command';
import { JsonObject } from '@angular-devkit/core';
import { CliConfig } from '../models/config';

export function getConfigValues(
  commandName: 'new' | 'generate',
  schematicName: string,
  definedOptions: Option[],
  options: JsonObject): JsonObject {

  const baseJsonPath = `defaults.${commandName}.${schematicName}.`;
  return definedOptions
    .map(o => o.name)
    .filter(name => options[name] === undefined)
    .reduce((opts, name) => {
      const value = CliConfig.getValue(`${baseJsonPath}.${name}`);
      if (value !== undefined) {
        opts[name] = value;
      }
      return opts;
    }, {...options});
}

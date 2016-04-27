import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.resolve(process.env.CLI_ROOT, 'lib/config/schema.json');
const schema = require(schemaPath);

export const CLI_CONFIG_FILE_NAME = 'angular-cli.json';
export const ARRAY_METHODS = ['push', 'splice', 'sort', 'reverse', 'pop', 'shift'];


function _findUp(name: string, from: string) {
  let currentDir = from;
  while (currentDir && currentDir !== path.parse(currentDir).root) {
    const p = path.join(currentDir, name);
    if (fs.existsSync(p)) {
      return p;
    }

    currentDir = path.resolve(currentDir, '..');
  }

  return null;
}


export class CliConfig {
  private _config: any;

  constructor(path?: string) {
    if (path) {
      try {
        fs.accessSync(path);
        this._config = require(path);
      } catch (e) {
        throw new Error(`Config file does not exits.`);
      }
    } else {
      this._config = CliConfig.fromProject();
    }
  }

  save(path: string = CliConfig._configFilePath()) {
    if (!path) {
      throw new Error('Could not find config path.');
    }

    fs.writeFileSync(path, JSON.stringify(this._config, null, 2), { encoding: 'utf-8' });
  }

  set(jsonPath: string, value: any, force: boolean = false): boolean {
    let method: any = null;
    let splittedPath = jsonPath.split('.');
    if (ARRAY_METHODS.indexOf(splittedPath[splittedPath.length - 1]) != -1) {
      method = splittedPath[splittedPath.length - 1];
      splittedPath.splice(splittedPath.length - 1, 1);
      jsonPath = splittedPath.join('.');
    }

    let { parent, name, remaining } = this._findParent(jsonPath);
    let properties: any;
    let additionalProperties: boolean;

    const checkPath = jsonPath.split('.').reduce((o, i) => {
      if (!o || !o.properties) {
        throw new Error(`Invalid config path.`);
      }
      properties = o.properties;
      additionalProperties = o.additionalProperties;

      return o.properties[i];
    }, schema);
    const configPath = jsonPath.split('.').reduce((o, i) => o[i], this._config);

    if (!properties[name] && !additionalProperties) {
      throw new Error(`${name} is not a known property.`);
    }

    if (method) {
      if (Array.isArray(configPath) && checkPath.type === 'array') {
        [][method].call(configPath, value);
        return true;
      } else {
        throw new Error(`Trying to use array method on non-array property type.`);
      }
    }

    if (typeof checkPath.type === 'string' && isNaN(value)) {
      parent[name] = value;
      return true;
    }

    if (typeof checkPath.type === 'number' && !isNaN(value)) {
      parent[name] = value;
      return true;
    }

    if (typeof value != checkPath.type) {
      throw new Error(`Invalid value type. Trying to set ${typeof value} to ${path.type}`);
    }
  }

  get(jsonPath: string): any {
    let { parent, name, remaining } = this._findParent(jsonPath);
    if (remaining || !(name in parent)) {
      return null;
    } else {
      return parent[name];
    }
  }

  private _validatePath(jsonPath: string) {
    if (!jsonPath.match(/^(?:[-_\w\d]+(?:\[\d+\])*\.)*(?:[-_\w\d]+(?:\[\d+\])*)$/)) {
      throw `Invalid JSON path: "${jsonPath}"`;
    }
  }

  private _findParent(jsonPath: string): { parent: any, name: string | number, remaining?: string } {
    this._validatePath(jsonPath);

    let parent: any = null;
    let current: any = this._config;

    const splitPath = jsonPath.split('.');
    let name: string | number = '';

    while (splitPath.length > 0) {
      const m = splitPath.shift().match(/^(.*?)(?:\[(\d+)\])*$/);

      name = m[1];
      const index: string = m[2];
      parent = current;
      current = current[name];

      if (current === null || current === undefined) {
        return {
          parent,
          name,
          remaining: (!isNaN(index) ? `[${index}]` : '') + splitPath.join('.')
        };
      }

      if (!isNaN(index)) {
        name = index;
        parent = current;
        current = current[index];

        if (current === null || current === undefined) {
          return {
            parent,
            name,
            remaining: splitPath.join('.')
          };
        }
      }
    }

    return { parent, name };
  }

  private static _configFilePath(projectPath?: string): string {
    // Find the configuration, either where specified, in the angular-cli project
    // (if it's in node_modules) or from the current process.
    return (projectPath && _findUp(CLI_CONFIG_FILE_NAME, projectPath))
        || _findUp(CLI_CONFIG_FILE_NAME, __dirname)
        || _findUp(CLI_CONFIG_FILE_NAME, process.cwd());
  }

  public static fromProject(): any {
    const configPath = CliConfig._configFilePath();
    return configPath ? require(configPath) : {};
  }
}

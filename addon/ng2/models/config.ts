import * as fs from 'fs';
import * as path from 'path';
import * as Proxy from 'harmony-proxy';
import * as Reflect from 'harmony-reflect';
import * as ObjectAssign from '../utilities/object-assign';

export const CLI_CONFIG_FILE_NAME = 'angular-cli.json';

export const ArrayMethods: Array<string> = ['pop', 'push', 'reverse', 'shift', 'sort', 'unshift'];

export const handler = {
  get: function(target: any, key: any, receiver: any) {
    if (key === 'toJSON') {
      return () => target;
    }

    if (key === 'length') {
      return;
    }

    if (key === 'inspect') {
      return target;
    }

    if (target.type === 'array') {
      const arr: Array<any> = [];
      arr[key].call(target.enum);
    }

    if (ArrayMethods.indexOf(key) === -1) {
      if (!(key in target)) {
        target[key] = new Proxy({ type: 'object' }, handler);
      }
      return Reflect.get(target, key, receiver);
    } else {
      return Reflect.get([], key, receiver);
    }
  },
  set: function(target: any, key: any, value: any) {
    if (key === 'length') {
      return;
    }

    if (!isNaN(key) && parseInt(key, 10) === 0) {
      if (!target.enum) {
        target.type = 'array';
        target.enum = [];
      }

      if (value) {
        target.enum.push(value);
      }
    } else {
      if (target[key] && target[key].type) {
        let type: string = target[key].type;
        let assigningType: string;

        if (!value && value === null) {
          assigningType = 'null';
        } else if (value && Array.isArray(value) && typeof value !== 'string') {
          assigningType = 'array';
        } else {
          assigningType = typeof value;
        }

        if (type !== assigningType) {
          throw new Error(`Cannot assign value of type '${assigningType}' to an property with type '${type}'.`);
        }
      }

      if (!value && value === null) {
        target[key] = { type: 'null', value: value };
      } else if (value && Array.isArray(value) && typeof value !== 'string') {
        target[key] = { type: 'array', enum: value };
      } else {
        if (typeof value === 'object' && Object.getOwnPropertyNames(value).length === 0) {
          target[key] = { type: typeof value };
        } else {
          target[key] = { type: typeof value, value: value };
        }
      }
    }
  }
};

export interface ConfigJson {
  routes?: { [name: string]: any },
  packages?: { [name: string]: any }
}

export class Config {
  path: ConfigJson;
  config: Proxy;

  constructor(path?: string) {
    if (path) {
      try {
        fs.accessSync(path);
        this.path = path;
        this.config = new Proxy({}, handler);
      } catch (e) {
        throw new Error(`${path} not found.`);
      }
    } else {
      this.path = this._configFilePath();
      this.config = new Proxy(this._fromProject(), handler);
    }
  }

  public save(): void {
    try {
      let config = ObjectAssign({}, JSON.parse(fs.readFileSync(this.path, 'utf8')), this.config.toJSON());
      fs.writeFileSync(this.path, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) {
      throw new Error(`Error while saving config.`);
    }
  }

  public set(path: string, value: any): void {
    const levels = path.split('.');
    let current = this.config;
    let i = 0;
    while (i < levels.length - 1) {
      delete current[levels[i]];
      current = current[levels[i]];
      i += 1;
    }
    
    current[levels[levels.length - 1]] = value;
  }

  public get(obj: any, path: string): any {
    const levels = path.split('.');
    let current = obj;
    let i = 0;
    while (i < levels.length) {
      if (current[levels[i]]) {
        current = current[levels[i]];
        i += 1;
      } else {
        return null;
      }
    }

    if (current.type === 'array') {
      return current.enum;
    } else if (current.type === 'object') {
      return current;
    } else {
      return current.value;
    }
  }

  public validatePath(jsonPath: string) {
    if (!jsonPath.match(/^(?:[-_\w\d]+(?:\[\d+\])*\.)*(?:[-_\w\d]+(?:\[\d+\])*)$/)) {
      throw `Invalid JSON path: "${jsonPath}"`;
    }
  }

  private _findUp(name: string, from: string): string {
    let currentDir = from;
    while (currentDir && currentDir != '/') {
      const p = path.join(currentDir, name);
      if (fs.existsSync(p)) {
        return p;
      }

      currentDir = path.resolve(currentDir, '..');
    }

    return null;
  }

  private _configFilePath(projectPath?: string): string {
    // Find the configuration, either where specified, in the angular-cli project
    // (if it's in node_modules) or from the current process.
    return (projectPath && this._findUp(CLI_CONFIG_FILE_NAME, projectPath))
        || this._findUp(CLI_CONFIG_FILE_NAME, __dirname)
        || this._findUp(CLI_CONFIG_FILE_NAME, process.cwd());
  }

  private _fromProject(): ConfigJson {
    const configPath = this._configFilePath();
    return configPath ? require(configPath) : {};
  }
}

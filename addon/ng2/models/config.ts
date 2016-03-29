import * as fs from 'fs';
import * as path from 'path';


export const CLI_CONFIG_FILE_NAME = 'angular-cli.json';


export interface CliConfigJson {
  routes?: { [name: string]: any },
  packages?: { [name: string]: any }
}


function _findUp(name: string, from: string) {
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


export class CliConfig {
  constructor(private _config: CliConfigJson = CliConfig.fromProject()) {}

  save(path: string = CliConfig.configFilePath()) {
    if (!path) {
      throw new Error('Could not find config path.');
    }

    fs.writeFileSync(path, JSON.stringify(this._config, null, 2), { encoding: 'utf-8' });
  }

  set(jsonPath: string, value: any, force: boolean = false): boolean {
    let { parent, name, remaining } = this._findParent(jsonPath);
    while (force && remaining) {
      if (remaining.indexOf('.') != -1) {
        // Create an empty map.
        // TODO: create the object / array based on the Schema of the configuration.
        parent[name] = {};
      }

    }

    parent[name] = value;
    return true;
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

  static configFilePath(projectPath?: string): string {
    // Find the configuration, either where specified, in the angular-cli project
    // (if it's in node_modules) or from the current process.
    return (projectPath && _findUp(CLI_CONFIG_FILE_NAME, projectPath))
        || _findUp(CLI_CONFIG_FILE_NAME, __dirname)
        || _findUp(CLI_CONFIG_FILE_NAME, process.cwd());
  }

  static fromProject(): CliConfigJson {
    const configPath = this.configFilePath();
    return configPath ? require(configPath) : {};
  }
}

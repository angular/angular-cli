import * as fs from 'fs';
import * as path from 'path';
import * as jp from 'jsonpath';
import * as chalk from 'chalk';

const schemaPath = path.resolve(process.env.CLI_ROOT, 'lib/config/schema.json');
const schema = require(schemaPath);

export const CLI_CONFIG_FILE_NAME = 'angular-cli.json';
export const ARRAY_METHODS = ['push', 'splice', 'sort', 'reverse', 'pop', 'shift'];

export class CliConfig {
  public project: any;
  public global: any;

  constructor() {
    this.global = this._fromCli();
    this.project = this._fromProject();
  }

  save(global = false) {
    let config = (global || !this.project) ? this.global : this.project;
    fs.writeFileSync(path, JSON.stringify(config, null, 2), { encoding: 'utf-8' });
  }

  checkValidSchemaPath(jsonPath: Object): boolean {
    const parsed = jp.parse(jsonPath);
    const invalidMsg = `${jsonPath} does not match schema.`;
    let propertiesPath;

    parsed.forEach((p, i) => {
      let type = p.expression.type;
      let value = p.expression.value;

      if (i === parsed.length - 1) {
        return;
      }

      if (!i) {
        propertiesPath = `properties.${value}`;
      } else {
        if (type === 'numeric_literal') {
          let prop = propertiesPath.split('.').reduce((prev, curr) => prev[curr], schema);
          if (prop.type !== 'array') {
            throw new Error(invalidMsg);
          } else {
            propertiesPath += `.items`;
          }
        } else {
          propertiesPath += `.properties.${value}`;
        }
      }
    });

    if (!propertiesPath.split('.').reduce((prev, curr) => prev[curr], schema)) {
      throw new Error(invalidMsg);
    } else {
      return true;
    }
  }

  set(jsonPath: string, value: any, global = false): boolean {
    let config = (global || !this.project) ? this.global : this.project;

    this._validatePath(jsonPath);
    this.checkValidSchemaPath(jsonPath);

    if (value.slice(0, 1) === '{' && value.slice(-1) === '}') {
      try {
        value = JSON.parse(value.replace(/\'/g, '\"'));
      } catch (e) {
        throw new Error(`Invalid JSON value ${value}`);
      }
    }

    let prop = jsonPath.split('.').reduce((prev, curr) => prev[curr], config);

    if (ARRAY_METHODS.indexOf(path.extname(jsonPath).replace('.', '')) !== -1) {
      let method = path.extname(jsonPath);
      let parentPath = jsonPath.replace(path.extname(jsonPath), '');

      if (typeof jp.query(config, `$.${parentPath}`)[0] === 'string') {
        throw new Error(`Cannot use array method on non-array type.`);
      } else {
        [][method].call(parent, value);
      }
    }

    if (!prop) {
      throw new Error(`Property does not exists.`);
    }

    jp.value(config, `$.${jsonPath}`, value);

    return true;
  }

  get(jsonPath: string, global = false): any {
    let config = (global || !this.project) ? this.global : this.project;
    let results = jp.query(config, `$.${jsonPath}`);

    return (results.length) ? results[0] : null;
  }

  private _validatePath(jsonPath: string) {
    try {
      jp.parse(jsonPath);
    } catch (e) {
      throw `Invalid JSON path: "${jsonPath}"`;
    }
  }

  private _fromProject(): any {
    const configPath = this._findUp(CLI_CONFIG_FILE_NAME, process.cwd());
    try {
      fs.accessSync(configPath);
      return JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
    } catch (e) {
      return {};
    }
  }

  private _fromCli(): any {
    const configPath = this._findUp(CLI_CONFIG_FILE_NAME, process.env.CLI_ROOT);
    try {
      fs.accessSync(configPath);
      return JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
    } catch (e) {
      return {};
    }
  }

  private _findUp(name: string, from: string): any {
    let currentDir = from;
    while (currentDir && currentDir !== path.parse(currentDir).root) {
      let p = path.join(currentDir, name);
      try {
        fs.accessSync(p);
        return p;
      } catch (e) {
        currentDir = path.resolve(currentDir, '..');
      }
    }
    return null;
  }
}

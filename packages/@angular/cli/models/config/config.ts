import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { stripIndent } from 'common-tags';

import {SchemaClass, SchemaClassFactory} from '@ngtools/json-schema';


const DEFAULT_CONFIG_SCHEMA_PATH = path.join(__dirname, '../../lib/config/schema.json');

class InvalidConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = 'InvalidConfigError';
  }
}


export class CliConfig<JsonType> {
  private _config: SchemaClass<JsonType>;

  constructor(private _configPath: string,
                      schema: Object,
                      configJson: JsonType,
                      fallbacks: JsonType[] = []) {
    this._config = new (SchemaClassFactory<JsonType>(schema))(configJson, ...fallbacks);
  }

  get config(): JsonType { return <any>this._config; }

  save(path: string = this._configPath) {
    return fs.writeFileSync(path, this.serialize(), {encoding: 'utf-8'});
  }
  serialize(mimetype = 'application/json'): string {
    return this._config.$$serialize(mimetype);
  }

  alias(path: string, newPath: string): boolean {
    return this._config.$$alias(path, newPath);
  }

  get(jsonPath?: string) {
    if (!jsonPath) {
      return this._config.$$root();
    }
    return this._config.$$get(jsonPath);
  }

  typeOf(jsonPath: string): string {
    return this._config.$$typeOf(jsonPath);
  }
  isDefined(jsonPath: string): boolean {
    return this._config.$$defined(jsonPath);
  }
  deletePath(jsonPath: string) {
    return this._config.$$delete(jsonPath);
  }

  set(jsonPath: string, value: any) {
    this._config.$$set(jsonPath, value);
  }

  getPaths(baseJsonPath: string, keys: string[]) {
    const ret: { [k: string]: any } = {};
    keys.forEach(key => ret[key] = this.get(`${baseJsonPath}.${key}`));
    return ret;
  }

  static fromJson<ConfigType>(content: ConfigType, ...global: ConfigType[]) {
    const schemaContent = fs.readFileSync(DEFAULT_CONFIG_SCHEMA_PATH, 'utf-8');
    let schema: Object;
    try {
      schema = JSON.parse(schemaContent);
    } catch (err) {
      throw new InvalidConfigError(err.message);
    }

    return new CliConfig<ConfigType>(null, schema, content, global);
  }

  static fromConfigPath<T>(configPath: string, otherPath: string[] = []): CliConfig<T> {
    const configContent = ts.sys.readFile(configPath) || '{}';
    const schemaContent = fs.readFileSync(DEFAULT_CONFIG_SCHEMA_PATH, 'utf-8');

    let otherContents = new Array<string>();
    if (configPath !== otherPath[0]) {
      otherContents = otherPath
        .map(path => ts.sys.readFile(path))
        .filter(content => !!content);
    }

    let content: T;
    let schema: Object;
    let others: T[];

    try {
      content = JSON.parse(configContent);
    } catch (err) {
      throw new InvalidConfigError(stripIndent`
        Parsing '${configPath}' failed. Ensure the file is valid JSON.
        Error: ${err.message}
      `);
    }

    others = otherContents.map(otherContent => {
      try {
        return JSON.parse(otherContent);
      } catch (err) {
        throw new InvalidConfigError(stripIndent`
          Parsing '${configPath}' failed. Ensure the file is valid JSON.
          Error: ${err.message}
        `);
      }
    });

    try {
      schema = JSON.parse(schemaContent);
    } catch (err) {
      throw new InvalidConfigError(
        `Parsing Angular CLI schema failed. Error:\n${err.message}`
      );
    }

    return new CliConfig<T>(configPath, schema, content, others);
  }
}

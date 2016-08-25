import * as fs from 'fs';
import * as path from 'path';

import {SchemaClass, SchemaClassFactory} from '../json-schema/schema-class-factory';


const DEFAULT_CONFIG_SCHEMA_PATH = path.join(__dirname, '../../../../lib/config/schema.json');


export class InvalidConfigError extends Error {
  constructor(err: Error) {
    super(err.message);
  }
}


export class CliConfig<Config> {
  private _config: SchemaClass<Config>;

  constructor(private _configPath: string,
                      schema: Object,
                      configJson: Config,
                      fallbacks: Config[] = []) {
    this._config = new (SchemaClassFactory<Config>(schema))(configJson, ...fallbacks);
  }

  get config(): Config { return this._config; }

  save(path: string = this._configPath) {
    return fs.writeFileSync(path, this.serialize(), 'utf-8');
  }
  serialize(mimetype = 'application/json'): string {
    return this._config.$$serialize(mimetype);
  }

  alias(path: string, newPath: string): boolean {
    return this._config.$$alias(path, newPath);
  }

  get(jsonPath: string) {
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

  static fromJson(schema: Object, content: Config, ...global: Config[]) {
    return new CliConfig(null, schema, content, global);
  }

  static fromConfigPath(configPath: string, otherPath: string[] = []): CliConfig {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const schemaContent = fs.readFileSync(DEFAULT_CONFIG_SCHEMA_PATH, 'utf-8');
    const otherContents = otherPath
      .map(path => fs.existsSync(path) && fs.readFileSync(path, 'utf-8'))
      .filter(content => !!content);

    let content;
    let schema;
    let others;

    try {
      content = JSON.parse(configContent);
      schema = JSON.parse(schemaContent);
      others = otherContents.map(otherContent => JSON.parse(otherContent));
    } catch (err) {
      throw new InvalidConfigError(err);
    }

    return new CliConfig(configPath, schema, content, others);
  }
}

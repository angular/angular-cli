/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import Ajv, { ValidateFunction } from 'ajv';
import ajvAddFormats from 'ajv-formats';
import * as http from 'http';
import * as https from 'https';
import { Observable, from, isObservable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as Url from 'url';
import { BaseException } from '../../exception/exception';
import { PartiallyOrderedSet, deepCopy } from '../../utils';
import { JsonArray, JsonObject, JsonValue, isJsonObject } from '../interface';
import {
  JsonPointer,
  JsonVisitor,
  PromptDefinition,
  PromptProvider,
  SchemaFormat,
  SchemaRegistry,
  SchemaValidator,
  SchemaValidatorError,
  SchemaValidatorOptions,
  SchemaValidatorResult,
  SmartDefaultProvider,
} from './interface';
import { JsonSchema } from './schema';
import { getTypesOfSchema } from './utility';
import { visitJson, visitJsonSchema } from './visitor';

export type UriHandler = (
  uri: string,
) => Observable<JsonObject> | Promise<JsonObject> | null | undefined;

export class SchemaValidationException extends BaseException {
  public readonly errors: SchemaValidatorError[];

  constructor(
    errors?: SchemaValidatorError[],
    baseMessage = 'Schema validation failed with the following errors:',
  ) {
    if (!errors || errors.length === 0) {
      super('Schema validation failed.');
      this.errors = [];

      return;
    }

    const messages = SchemaValidationException.createMessages(errors);
    super(`${baseMessage}\n  ${messages.join('\n  ')}`);
    this.errors = errors;
  }

  public static createMessages(errors?: SchemaValidatorError[]): string[] {
    if (!errors || errors.length === 0) {
      return [];
    }

    const messages = errors.map((err) => {
      let message = `Data path ${JSON.stringify(err.instancePath)} ${err.message}`;
      if (err.keyword === 'additionalProperties') {
        message += `(${err.params.additionalProperty})`;
      }

      return message + '.';
    });

    return messages;
  }
}

interface SchemaInfo {
  smartDefaultRecord: Map<string, JsonObject>;
  promptDefinitions: Array<PromptDefinition>;
}

export class CoreSchemaRegistry implements SchemaRegistry {
  private _ajv: Ajv;
  private _uriCache = new Map<string, JsonObject>();
  private _uriHandlers = new Set<UriHandler>();
  private _pre = new PartiallyOrderedSet<JsonVisitor>();
  private _post = new PartiallyOrderedSet<JsonVisitor>();

  private _currentCompilationSchemaInfo?: SchemaInfo;

  private _smartDefaultKeyword = false;
  private _promptProvider?: PromptProvider;
  private _sourceMap = new Map<string, SmartDefaultProvider<{}>>();

  constructor(formats: SchemaFormat[] = []) {
    this._ajv = new Ajv({
      strict: false,
      loadSchema: (uri: string) => this._fetch(uri),
      passContext: true,
    });

    ajvAddFormats(this._ajv);

    for (const format of formats) {
      this.addFormat(format);
    }
  }

  private async _fetch(uri: string): Promise<JsonObject> {
    const maybeSchema = this._uriCache.get(uri);

    if (maybeSchema) {
      return maybeSchema;
    }

    // Try all handlers, one after the other.
    for (const handler of this._uriHandlers) {
      let handlerResult = handler(uri);
      if (handlerResult === null || handlerResult === undefined) {
        continue;
      }

      if (isObservable(handlerResult)) {
        handlerResult = handlerResult.toPromise();
      }

      const value = await handlerResult;
      this._uriCache.set(uri, value);

      return value;
    }

    // If none are found, handle using http client.
    return new Promise<JsonObject>((resolve, reject) => {
      const url = new Url.URL(uri);
      const client = url.protocol === 'https:' ? https : http;
      client.get(url, (res) => {
        if (!res.statusCode || res.statusCode >= 300) {
          // Consume the rest of the data to free memory.
          res.resume();
          reject(new Error(`Request failed. Status Code: ${res.statusCode}`));
        } else {
          res.setEncoding('utf8');
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              this._uriCache.set(uri, json);
              resolve(json);
            } catch (err) {
              reject(err);
            }
          });
        }
      });
    });
  }

  /**
   * Add a transformation step before the validation of any Json.
   * @param {JsonVisitor} visitor The visitor to transform every value.
   * @param {JsonVisitor[]} deps A list of other visitors to run before.
   */
  addPreTransform(visitor: JsonVisitor, deps?: JsonVisitor[]) {
    this._pre.add(visitor, deps);
  }

  /**
   * Add a transformation step after the validation of any Json. The JSON will not be validated
   * after the POST, so if transformations are not compatible with the Schema it will not result
   * in an error.
   * @param {JsonVisitor} visitor The visitor to transform every value.
   * @param {JsonVisitor[]} deps A list of other visitors to run before.
   */
  addPostTransform(visitor: JsonVisitor, deps?: JsonVisitor[]) {
    this._post.add(visitor, deps);
  }

  protected _resolver(
    ref: string,
    validate?: ValidateFunction,
  ): { context?: ValidateFunction; schema?: JsonObject } {
    if (!validate || !ref) {
      return {};
    }

    const schema = validate.schemaEnv.root.schema;
    const id = typeof schema === 'object' ? schema.$id : null;

    let fullReference = ref;
    if (typeof id === 'string') {
      fullReference = Url.resolve(id, ref);

      if (ref.startsWith('#')) {
        fullReference = id + fullReference;
      }
    }

    if (fullReference.startsWith('#')) {
      fullReference = fullReference.slice(0, -1);
    }
    const resolvedSchema = this._ajv.getSchema(fullReference);

    return {
      context: resolvedSchema?.schemaEnv.validate,
      schema: resolvedSchema?.schema as JsonObject,
    };
  }

  /**
   * Flatten the Schema, resolving and replacing all the refs. Makes it into a synchronous schema
   * that is also easier to traverse. Does not cache the result.
   *
   * @param schema The schema or URI to flatten.
   * @returns An Observable of the flattened schema object.
   * @deprecated since 11.2 without replacement.
   * Producing a flatten schema document does not in all cases produce a schema with identical behavior to the original.
   * See: https://json-schema.org/draft/2019-09/json-schema-core.html#rfc.appendix.B.2
   */
  flatten(schema: JsonObject): Observable<JsonObject> {
    return from(this._flatten(schema));
  }

  private async _flatten(schema: JsonObject): Promise<JsonObject> {
    this._replaceDeprecatedSchemaIdKeyword(schema);
    this._ajv.removeSchema(schema);

    this._currentCompilationSchemaInfo = undefined;
    const validate = await this._ajv.compileAsync(schema);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    function visitor(
      current: JsonObject | JsonArray,
      pointer: JsonPointer,
      parentSchema?: JsonObject | JsonArray,
      index?: string,
    ) {
      if (
        current &&
        parentSchema &&
        index &&
        isJsonObject(current) &&
        Object.prototype.hasOwnProperty.call(current, '$ref') &&
        typeof current['$ref'] == 'string'
      ) {
        const resolved = self._resolver(current['$ref'], validate);

        if (resolved.schema) {
          (parentSchema as JsonObject)[index] = resolved.schema;
        }
      }
    }

    const schemaCopy = deepCopy(validate.schema as JsonObject);
    visitJsonSchema(schemaCopy, visitor);

    return schemaCopy;
  }

  /**
   * Compile and return a validation function for the Schema.
   *
   * @param schema The schema to validate. If a string, will fetch the schema before compiling it
   * (using schema as a URI).
   * @returns An Observable of the Validation function.
   */
  compile(schema: JsonSchema): Observable<SchemaValidator> {
    return from(this._compile(schema)).pipe(
      map((validate) => (value, options) => from(validate(value, options))),
    );
  }

  private async _compile(
    schema: JsonSchema,
  ): Promise<
    (data: JsonValue, options?: SchemaValidatorOptions) => Promise<SchemaValidatorResult>
  > {
    if (typeof schema === 'boolean') {
      return async (data) => ({ success: schema, data });
    }

    this._replaceDeprecatedSchemaIdKeyword(schema);

    const schemaInfo: SchemaInfo = {
      smartDefaultRecord: new Map<string, JsonObject>(),
      promptDefinitions: [],
    };

    this._ajv.removeSchema(schema);

    let validator: ValidateFunction;
    try {
      this._currentCompilationSchemaInfo = schemaInfo;
      validator = this._ajv.compile(schema);
    } finally {
      this._currentCompilationSchemaInfo = undefined;
    }

    return async (data: JsonValue, options?: SchemaValidatorOptions) => {
      const validationOptions: SchemaValidatorOptions = {
        withPrompts: true,
        applyPostTransforms: true,
        applyPreTransforms: true,
        ...options,
      };
      const validationContext = {
        promptFieldsWithValue: new Set<string>(),
      };

      // Apply pre-validation transforms
      if (validationOptions.applyPreTransforms) {
        for (const visitor of this._pre.values()) {
          data = await visitJson(
            data,
            visitor,
            schema,
            this._resolver.bind(this),
            validator,
          ).toPromise();
        }
      }

      // Apply smart defaults
      await this._applySmartDefaults(data, schemaInfo.smartDefaultRecord);

      // Apply prompts
      if (validationOptions.withPrompts) {
        const visitor: JsonVisitor = (value, pointer) => {
          if (value !== undefined) {
            validationContext.promptFieldsWithValue.add(pointer);
          }

          return value;
        };
        if (typeof schema === 'object') {
          await visitJson(data, visitor, schema, this._resolver.bind(this), validator).toPromise();
        }

        const definitions = schemaInfo.promptDefinitions.filter(
          (def) => !validationContext.promptFieldsWithValue.has(def.id),
        );

        if (definitions.length > 0) {
          await this._applyPrompts(data, definitions);
        }
      }

      // Validate using ajv
      const success = await validator.call(validationContext, data);
      if (!success) {
        return { data, success, errors: validator.errors ?? [] };
      }

      // Apply post-validation transforms
      if (validationOptions.applyPostTransforms) {
        for (const visitor of this._post.values()) {
          data = await visitJson(
            data,
            visitor,
            schema,
            this._resolver.bind(this),
            validator,
          ).toPromise();
        }
      }

      return { data, success: true };
    };
  }

  addFormat(format: SchemaFormat): void {
    this._ajv.addFormat(format.name, format.formatter);
  }

  addSmartDefaultProvider<T>(source: string, provider: SmartDefaultProvider<T>) {
    if (this._sourceMap.has(source)) {
      throw new Error(source);
    }

    this._sourceMap.set(source, provider);

    if (!this._smartDefaultKeyword) {
      this._smartDefaultKeyword = true;

      this._ajv.addKeyword({
        keyword: '$default',
        errors: false,
        valid: true,
        compile: (schema, _parentSchema, it) => {
          const compilationSchemInfo = this._currentCompilationSchemaInfo;
          if (compilationSchemInfo === undefined) {
            return () => true;
          }

          // We cheat, heavily.
          const pathArray = it.dataPathArr
            .slice(1, it.dataLevel + 1)
            .map((p) => (typeof p === 'number' ? p : p.str.slice(1, -1)));

          compilationSchemInfo.smartDefaultRecord.set(JSON.stringify(pathArray), schema);

          return () => true;
        },
        metaSchema: {
          type: 'object',
          properties: {
            '$source': { type: 'string' },
          },
          additionalProperties: true,
          required: ['$source'],
        },
      });
    }
  }

  registerUriHandler(handler: UriHandler) {
    this._uriHandlers.add(handler);
  }

  usePromptProvider(provider: PromptProvider) {
    const isSetup = !!this._promptProvider;

    this._promptProvider = provider;

    if (isSetup) {
      return;
    }

    this._ajv.addKeyword({
      keyword: 'x-prompt',
      errors: false,
      valid: true,
      compile: (schema, parentSchema, it) => {
        const compilationSchemInfo = this._currentCompilationSchemaInfo;
        if (!compilationSchemInfo) {
          return () => true;
        }

        const path =
          '/' +
          it.dataPathArr
            .slice(1, it.dataLevel + 1)
            .map((p) => (typeof p === 'number' ? p : p.str.slice(1, -1)))
            .join('/');

        let type: string | undefined;
        let items: Array<string | { label: string; value: string | number | boolean }> | undefined;
        let message: string;
        if (typeof schema == 'string') {
          message = schema;
        } else {
          message = schema.message;
          type = schema.type;
          items = schema.items;
        }

        const propertyTypes = getTypesOfSchema(parentSchema as JsonObject);
        if (!type) {
          if (propertyTypes.size === 1 && propertyTypes.has('boolean')) {
            type = 'confirmation';
          } else if (Array.isArray((parentSchema as JsonObject).enum)) {
            type = 'list';
          } else if (
            propertyTypes.size === 1 &&
            propertyTypes.has('array') &&
            (parentSchema as JsonObject).items &&
            Array.isArray(((parentSchema as JsonObject).items as JsonObject).enum)
          ) {
            type = 'list';
          } else {
            type = 'input';
          }
        }

        let multiselect;
        if (type === 'list') {
          multiselect =
            schema.multiselect === undefined
              ? propertyTypes.size === 1 && propertyTypes.has('array')
              : schema.multiselect;

          const enumValues = multiselect
            ? (parentSchema as JsonObject).items &&
              ((parentSchema as JsonObject).items as JsonObject).enum
            : (parentSchema as JsonObject).enum;
          if (!items && Array.isArray(enumValues)) {
            items = [];
            for (const value of enumValues) {
              if (typeof value == 'string') {
                items.push(value);
              } else if (typeof value == 'object') {
                // Invalid
              } else {
                items.push({ label: value.toString(), value });
              }
            }
          }
        }

        const definition: PromptDefinition = {
          id: path,
          type,
          message,
          raw: schema,
          items,
          multiselect,
          propertyTypes,
          default:
            typeof (parentSchema as JsonObject).default == 'object' &&
            (parentSchema as JsonObject).default !== null &&
            !Array.isArray((parentSchema as JsonObject).default)
              ? undefined
              : ((parentSchema as JsonObject).default as string[]),
          async validator(data: JsonValue) {
            try {
              const result = await it.self.validate(parentSchema, data);
              // If the schema is sync then false will be returned on validation failure
              if (result) {
                return result;
              } else if (it.self.errors?.length) {
                // Validation errors will be present on the Ajv instance when sync
                return it.self.errors[0].message;
              }
            } catch (e) {
              // If the schema is async then an error will be thrown on validation failure
              if (Array.isArray(e.errors) && e.errors.length) {
                return e.errors[0].message;
              }
            }

            return false;
          },
        };

        compilationSchemInfo.promptDefinitions.push(definition);

        return function (this: { promptFieldsWithValue: Set<string> }) {
          // If 'this' is undefined in the call, then it defaults to the global
          // 'this'.
          if (this && this.promptFieldsWithValue) {
            this.promptFieldsWithValue.add(path);
          }

          return true;
        };
      },
      metaSchema: {
        oneOf: [
          { type: 'string' },
          {
            type: 'object',
            properties: {
              'type': { type: 'string' },
              'message': { type: 'string' },
            },
            additionalProperties: true,
            required: ['message'],
          },
        ],
      },
    });
  }

  private async _applyPrompts(data: JsonValue, prompts: Array<PromptDefinition>): Promise<void> {
    const provider = this._promptProvider;
    if (!provider) {
      return;
    }

    const answers = await from(provider(prompts)).toPromise();
    for (const path in answers) {
      const pathFragments = path.split('/').slice(1);

      CoreSchemaRegistry._set(data, pathFragments, answers[path], null, undefined, true);
    }
  }

  private static _set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    fragments: string[],
    value: unknown,
    parent: Record<string, unknown> | null = null,
    parentProperty?: string,
    force?: boolean,
  ): void {
    for (const fragment of fragments) {
      if (!data && parent !== null && parentProperty) {
        data = parent[parentProperty] = {};
      }

      parent = data;
      parentProperty = fragment;
      data = data[fragment];
    }

    if (parent && parentProperty && (force || parent[parentProperty] === undefined)) {
      parent[parentProperty] = value;
    }
  }

  private async _applySmartDefaults<T>(
    data: T,
    smartDefaults: Map<string, JsonObject>,
  ): Promise<void> {
    for (const [pointer, schema] of smartDefaults.entries()) {
      const fragments = JSON.parse(pointer);
      const source = this._sourceMap.get(schema.$source as string);
      if (!source) {
        continue;
      }

      let value = source(schema);
      if (isObservable(value)) {
        value = await value.toPromise();
      }

      CoreSchemaRegistry._set(data, fragments, value);
    }
  }

  useXDeprecatedProvider(onUsage: (message: string) => void): void {
    this._ajv.addKeyword({
      keyword: 'x-deprecated',
      validate: (schema, _data, _parentSchema, dataCxt) => {
        if (schema) {
          onUsage(
            `Option "${dataCxt?.parentDataProperty}" is deprecated${
              typeof schema == 'string' ? ': ' + schema : '.'
            }`,
          );
        }

        return true;
      },
      errors: false,
    });
  }

  /**
   * Workaround to avoid a breaking change in downstream schematics.
   * @deprecated will be removed in version 13.
   */
  private _replaceDeprecatedSchemaIdKeyword(schema: JsonObject): void {
    if (typeof schema.id === 'string') {
      schema.$id = schema.id;
      delete schema.id;

      // eslint-disable-next-line no-console
      console.warn(
        `"${schema.$id}" schema is using the keyword "id" which its support is deprecated. Use "$id" for schema ID.`,
      );
    }
  }
}

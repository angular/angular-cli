/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ajv from 'ajv';
import * as http from 'http';
import { Observable, from, of as observableOf, throwError } from 'rxjs';
import { concatMap, map, switchMap, tap } from 'rxjs/operators';
import { BaseException } from '../../exception/exception';
import { PartiallyOrderedSet, isObservable } from '../../utils';
import { JsonObject, JsonValue } from '../interface';
import {
  PromptDefinition,
  PromptProvider,
  SchemaFormat,
  SchemaFormatter,
  SchemaRegistry,
  SchemaValidator,
  SchemaValidatorError,
  SchemaValidatorOptions,
  SchemaValidatorResult,
  SmartDefaultProvider,
} from './interface';
import { addUndefinedDefaults } from './transforms';
import { JsonVisitor, visitJson } from './visitor';

const serialize = require('fast-json-stable-stringify');

// This interface should be exported from ajv, but they only export the class and not the type.
interface AjvValidationError {
  message: string;
  errors: Array<ajv.ErrorObject>;
  ajv: true;
  validation: true;
}

export class SchemaValidationException extends BaseException {
  public readonly errors: SchemaValidatorError[];

  constructor(
    errors?: SchemaValidatorError[],
    baseMessage = 'Schema validation failed with the following errors:',
  ) {
    if (!errors || errors.length === 0) {
      super('Schema validation failed.');

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
      let message = `Data path ${JSON.stringify(err.dataPath)} ${err.message}`;
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
  private _ajv: ajv.Ajv;
  private _uriCache = new Map<string, JsonObject>();
  private _pre = new PartiallyOrderedSet<JsonVisitor>();
  private _post = new PartiallyOrderedSet<JsonVisitor>();
  private _currentCompilationSchemaInfo?: SchemaInfo;
  private _validatorCache = new Map<string, SchemaValidator>();

  private _smartDefaultKeyword = false;
  private _promptProvider?: PromptProvider;
  private _sourceMap = new Map<string, SmartDefaultProvider<{}>>();

  constructor(formats: SchemaFormat[] = []) {
    /**
     * Build an AJV instance that will be used to validate schemas.
     */

    const formatsObj: { [name: string]: SchemaFormatter } = {};

    for (const format of formats) {
      formatsObj[format.name] = format.formatter;
    }

    this._ajv = ajv({
      formats: formatsObj,
      loadSchema: (uri: string) => this._fetch(uri),
      schemaId: 'auto',
      passContext: true,
    });

    this._ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
    this._ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));

    this.addPostTransform(addUndefinedDefaults);
  }

  private _fetch(uri: string): Promise<JsonObject> {
    const maybeSchema = this._uriCache.get(uri);

    if (maybeSchema) {
      return Promise.resolve(maybeSchema);
    }

    return new Promise<JsonObject>((resolve, reject) => {
      http.get(uri, res => {
        if (!res.statusCode || res.statusCode >= 300) {
          // Consume the rest of the data to free memory.
          res.resume();
          reject(`Request failed. Status Code: ${res.statusCode}`);
        } else {
          res.setEncoding('utf8');
          let data = '';
          res.on('data', chunk => {
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
    validate: ajv.ValidateFunction,
  ): { context?: ajv.ValidateFunction, schema?: JsonObject } {
    if (!validate || !validate.refs || !validate.refVal || !ref) {
      return {};
    }

    // tslint:disable-next-line:no-any
    const id = (validate.schema as any).$id || (validate.schema as any).id;
    let fullReference = (ref[0] === '#' && id) ? id + ref : ref;
    if (fullReference.endsWith('#')) {
      fullReference = fullReference.slice(0, -1);
    }

    // tslint:disable-next-line:no-any
    const context = validate.refVal[(validate.refs as any)[fullReference]];

    return { context, schema: context && context.schema as JsonObject };
  }

  compile(schema: JsonObject): Observable<SchemaValidator> {
    const schemaKey = serialize(schema);
    const existingValidator = this._validatorCache.get(schemaKey);
    if (existingValidator) {
      return observableOf(existingValidator);
    }

    const schemaInfo: SchemaInfo = {
      smartDefaultRecord: new Map<string, JsonObject>(),
      promptDefinitions: [],
    };

    // Supports both synchronous and asynchronous compilation, by trying the synchronous
    // version first, then if refs are missing this will fails.
    // We also add any refs from external fetched schemas so that those will also be used
    // in synchronous (if available).
    let validator: Observable<ajv.ValidateFunction>;
    try {
      this._currentCompilationSchemaInfo = schemaInfo;
      validator = observableOf(this._ajv.compile(schema));
    } catch (e) {
      // Propagate the error.
      if (!(e instanceof (ajv.MissingRefError as {} as Function))) {
        return throwError(e);
      }

      try {
        validator = from(this._ajv.compileAsync(schema));
      } catch (e) {
        return throwError(e);
      }
    }

    return validator
      .pipe(
        map<ajv.ValidateFunction, SchemaValidator>(validate => (data, options) => {
          const validationOptions: SchemaValidatorOptions = {
            withPrompts: true,
            ...options,
          };
          const validationContext = {
            promptFieldsWithValue: new Set<string>(),
          };

          return observableOf(data).pipe(
            ...[...this._pre].map(visitor => concatMap((data: JsonValue) => {
              return visitJson(data, visitor, schema, this._resolver, validate);
            })),
          ).pipe(
            switchMap(updateData => this._applySmartDefaults(
              updateData,
              schemaInfo.smartDefaultRecord,
            )),
            switchMap((updatedData: JsonValue) => {
              const result = validate.call(validationContext, updatedData);

              return typeof result == 'boolean'
                ? observableOf([updatedData, result])
                : from((result as Promise<boolean>)
                  .then(r => [updatedData, true])
                  .catch((err: Error | AjvValidationError) => {
                    if ((err as AjvValidationError).ajv) {
                      validate.errors = (err as AjvValidationError).errors;

                      return Promise.resolve([updatedData, false]);
                    }

                    return Promise.reject(err);
                  }));
            }),
            switchMap(([data, valid]: [JsonValue, boolean]) => {
              if (!validationOptions.withPrompts) {
                return observableOf([data, valid]);
              }

              const definitions = schemaInfo.promptDefinitions
                .filter(def => !validationContext.promptFieldsWithValue.has(def.id));

              if (valid && this._promptProvider && definitions.length > 0) {
                return from(this._applyPrompts(data, definitions)).pipe(
                  map(data => [data, valid]),
                );
              } else {
                return observableOf([data, valid]);
              }
            }),
            switchMap(([data, valid]: [JsonValue, boolean]) => {
              if (valid) {
                return observableOf(data).pipe(
                  ...[...this._post].map(visitor => concatMap((data: JsonValue) => {
                    return visitJson(data as JsonValue, visitor, schema, this._resolver, validate);
                  })),
                ).pipe(
                  map(data => [data, valid]),
                );
              } else {
                return observableOf([data, valid]);
              }
            }),
            map(([data, valid]: [JsonValue, boolean]) => {
              if (valid) {
                return { data, success: true } as SchemaValidatorResult;
              }

              return {
                data,
                success: false,
                errors: (validate.errors || []),
              } as SchemaValidatorResult;
            }),
          );
        }),
        tap(v => this._validatorCache.set(schemaKey, v)),
      );
  }

  addFormat(format: SchemaFormat): void {
    // tslint:disable-next-line:no-any
    const validate = (data: any) => {
      const result = format.formatter.validate(data);

      if (typeof result == 'boolean') {
        return result;
      } else {
        return result.toPromise();
      }
    };

    this._ajv.addFormat(format.name, {
      async: format.formatter.async,
      validate,
    // AJV typings list `compare` as required, but it is optional.
    // tslint:disable-next-line:no-any
    } as any);
  }

  addSmartDefaultProvider<T>(source: string, provider: SmartDefaultProvider<T>) {
    if (this._sourceMap.has(source)) {
      throw new Error(source);
    }

    this._sourceMap.set(source, provider);

    if (!this._smartDefaultKeyword) {
      this._smartDefaultKeyword = true;

      this._ajv.addKeyword('$default', {
        errors: false,
        valid: true,
        compile: (schema, _parentSchema, it) => {
          const compilationSchemInfo = this._currentCompilationSchemaInfo;
          if (!compilationSchemInfo) {
            throw new Error('Invalid JSON schema compilation state');
          }

          // We cheat, heavily.
          compilationSchemInfo.smartDefaultRecord.set(
            // tslint:disable-next-line:no-any
            JSON.stringify((it as any).dataPathArr.slice(1, it.dataLevel + 1) as string[]),
            schema,
          );

          return () => true;
        },
        metaSchema: {
          type: 'object',
          properties: {
            '$source': { type: 'string' },
          },
          additionalProperties: true,
          required: [ '$source' ],
        },
      });
    }
  }

  usePromptProvider(provider: PromptProvider) {
    const isSetup = !!this._promptProvider;

    this._promptProvider = provider;

    if (isSetup) {
      return;
    }

    this._ajv.addKeyword('x-prompt', {
      errors: false,
      valid: true,
      compile: (schema, parentSchema: JsonObject, it) => {
        const compilationSchemInfo = this._currentCompilationSchemaInfo;
        if (!compilationSchemInfo) {
          throw new Error('Invalid JSON schema compilation state');
        }

        // tslint:disable-next-line:no-any
        const pathArray = ((it as any).dataPathArr as string[]).slice(1, it.dataLevel + 1);
        const path = pathArray.join('/');

        let type: string | undefined;
        let items: Array<string | { label: string, value: string | number | boolean }> | undefined;
        let message: string;
        if (typeof schema == 'string') {
          message = schema;
        } else {
          message = schema.message;
          type = schema.type;
          items = schema.items;
        }

        if (!type) {
          if (parentSchema.type === 'boolean') {
            type = 'confirmation';
          } else if (Array.isArray(parentSchema.enum)) {
            type = 'list';
          } else {
            type = 'input';
          }
        }

        if (type === 'list' && !items) {
          if (Array.isArray(parentSchema.enum)) {
            type = 'list';
            items = [];
            for (const value of parentSchema.enum) {
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
          priority: 0,
          raw: schema,
          items,
          default: typeof parentSchema.default == 'object' ? undefined : parentSchema.default,
          async validator(data: string) {
            const result = it.self.validate(parentSchema, data);
            if (typeof result === 'boolean') {
              return result;
            } else {
              try {
                await result;

                return true;
              } catch {
                return false;
              }
            }
          },
        };

        compilationSchemInfo.promptDefinitions.push(definition);

        return function(this: { promptFieldsWithValue: Set<string> }) {
          if (this) {
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
            required: [ 'message' ],
          },
        ],
      },
    });
  }

  private _applyPrompts<T>(data: T, prompts: Array<PromptDefinition>): Observable<T> {
    const provider = this._promptProvider;
    if (!provider) {
      return observableOf(data);
    }

    prompts.sort((a, b) => b.priority - a.priority);

    return from(provider(prompts)).pipe(
      map(answers => {
        for (const path in answers) {
          CoreSchemaRegistry._set(
            data,
            path.split('/'),
            answers[path] as {},
            null,
            undefined,
            true,
          );
        }

        return data;
      }),
    );
  }

  private static _set(
    // tslint:disable-next-line:no-any
    data: any,
    fragments: string[],
    value: {},
    // tslint:disable-next-line:no-any
    parent: any | null = null,
    parentProperty?: string,
    force?: boolean,
  ): void {
    for (let i = 0; i < fragments.length; i++) {
      const f = fragments[i];

      if (f[0] == 'i') {
        if (!Array.isArray(data)) {
          return;
        }

        for (let j = 0; j < data.length; j++) {
          CoreSchemaRegistry._set(data[j], fragments.slice(i + 1), value, data, '' + j);
        }

        return;
      } else if (f.startsWith('key')) {
        if (typeof data !== 'object') {
          return;
        }

        Object.getOwnPropertyNames(data).forEach(property => {
          CoreSchemaRegistry._set(data[property], fragments.slice(i + 1), value, data, property);
        });

        return;
      } else if (f.startsWith('\'') && f[f.length - 1] == '\'') {
        const property = f
          .slice(1, -1)
          .replace(/\\'/g, '\'')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\f/g, '\f')
          .replace(/\\t/g, '\t');

        // We know we need an object because the fragment is a property key.
        if (!data && parent !== null && parentProperty) {
          data = parent[parentProperty] = {};
        }
        parent = data;
        parentProperty = property;

        data = data[property];
      } else {
        return;
      }
    }

    if (parent && parentProperty && (force || parent[parentProperty] === undefined)) {
      parent[parentProperty] = value;
    }
  }

  private _applySmartDefaults<T>(
    data: T,
    smartDefaults: Map<string, JsonObject>,
  ): Observable<T> {
    return observableOf(data).pipe(
      ...[...smartDefaults.entries()].map(([pointer, schema]) => {
        return concatMap<T, T>(data => {
          const fragments = JSON.parse(pointer);
          const source = this._sourceMap.get((schema as JsonObject).$source as string);

          let value = source ? source(schema) : observableOf(undefined);

          if (!isObservable(value)) {
            value = observableOf(value);
          }

          return (value as Observable<{}>).pipe(
            // Synchronously set the new data at the proper JsonSchema path.
            tap(x => CoreSchemaRegistry._set(data, fragments, x)),
            // But return the data object.
            map(() => data),
          );
        });
      }),
    );
  }
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ajv from 'ajv';
import * as http from 'http';
import { Observable, from, isObservable, of, throwError } from 'rxjs';
import { concatMap, map, switchMap, tap } from 'rxjs/operators';
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
  SchemaFormatter,
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

// This interface should be exported from ajv, but they only export the class and not the type.
interface AjvValidationError {
  message: string;
  errors: Array<ajv.ErrorObject>;
  ajv: true;
  validation: true;
}

interface AjvRefMap {
  refs: string[];
  refVal: any; // tslint:disable-line:no-any
  schema: JsonObject;
}

export type UriHandler = (uri: string) =>
  Observable<JsonObject> | Promise<JsonObject> | null | undefined;

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
  private _uriHandlers = new Set<UriHandler>();
  private _pre = new PartiallyOrderedSet<JsonVisitor>();
  private _post = new PartiallyOrderedSet<JsonVisitor>();

  private _currentCompilationSchemaInfo?: SchemaInfo;

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
  }

  private _fetch(uri: string): Promise<JsonObject> {
    const maybeSchema = this._uriCache.get(uri);

    if (maybeSchema) {
      return Promise.resolve(maybeSchema);
    }

    // Try all handlers, one after the other.
    for (const maybeHandler of this._uriHandlers) {
      const handler = maybeHandler(uri);
      if (handler) {
        // The AJV API only understands Promises.
        return from(handler).pipe(
          tap(json => this._uriCache.set(uri, json)),
        ).toPromise();
      }
    }

    // If none are found, handle using http client.
    return new Promise<JsonObject>((resolve, reject) => {
      http.get(uri, res => {
        if (!res.statusCode || res.statusCode >= 300) {
          // Consume the rest of the data to free memory.
          res.resume();
          reject(new Error(`Request failed. Status Code: ${res.statusCode}`));
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

    let refMap = validate as AjvRefMap;
    const rootRefMap = validate.root as AjvRefMap;

    // Resolve from the root if it's different.
    if (validate.root && validate.schema !== rootRefMap.schema) {
      refMap = rootRefMap;
    }

    const schema = refMap.schema ? typeof refMap.schema == 'object' && refMap.schema : null;
    const maybeId = schema ? (schema as JsonObject).id || (schema as JsonObject).$id : null;

    if (typeof maybeId == 'string') {
      ref = Url.resolve(maybeId, ref);
    }

    let fullReference = (ref[0] === '#' && maybeId) ? maybeId + ref : ref;
    if (fullReference.endsWith('#')) {
      fullReference = fullReference.slice(0, -1);
    }

    // tslint:disable-next-line:no-any
    const context = validate.refVal[(validate.refs as any)[fullReference]];

    if (typeof context == 'function') {
      // Context will be a function if the schema isn't loaded yet, and an actual schema if it's
      // synchronously available.
      return { context, schema: context && context.schema as JsonObject };
    } else {
      return { context: validate, schema: context as JsonObject };
    }
  }

  /**
   * Flatten the Schema, resolving and replacing all the refs. Makes it into a synchronous schema
   * that is also easier to traverse. Does not cache the result.
   *
   * @param schema The schema or URI to flatten.
   * @returns An Observable of the flattened schema object.
   */
  flatten(schema: JsonObject): Observable<JsonObject> {
    this._ajv.removeSchema(schema);

    // Supports both synchronous and asynchronous compilation, by trying the synchronous
    // version first, then if refs are missing this will fails.
    // We also add any refs from external fetched schemas so that those will also be used
    // in synchronous (if available).
    let validator: Observable<ajv.ValidateFunction>;
    try {
      this._currentCompilationSchemaInfo = undefined;
      validator = of(this._ajv.compile(schema)).pipe(
        tap(() => this._currentCompilationSchemaInfo = undefined),
      );
    } catch (e) {
      // Propagate the error.
      if (!(e instanceof (ajv.MissingRefError as {} as Function))) {
        return throwError(e);
      }

      this._currentCompilationSchemaInfo = undefined;
      validator = from(this._ajv.compileAsync(schema)).pipe(
        tap(() => this._currentCompilationSchemaInfo = undefined),
      );
    }

    return validator.pipe(
      switchMap(validate => {
        const self = this;

        function visitor(
          current: JsonObject | JsonArray,
          pointer: JsonPointer,
          parentSchema?: JsonObject | JsonArray,
          index?: string,
        ) {
          if (current
            && parentSchema
            && index
            && isJsonObject(current)
            && current.hasOwnProperty('$ref')
            && typeof current['$ref'] == 'string'
          ) {
            const resolved = self._resolver(current['$ref'] as string, validate);

            if (resolved.schema) {
              (parentSchema as JsonObject)[index] = resolved.schema;
            }
          }
        }

        const schema = deepCopy(validate.schema as JsonObject);
        visitJsonSchema(schema, visitor);

        return of(schema);
      }),
    );
  }

  /**
   * Compile and return a validation function for the Schema.
   *
   * @param schema The schema to validate. If a string, will fetch the schema before compiling it
   * (using schema as a URI).
   * @returns An Observable of the Validation function.
   */
  compile(schema: JsonSchema): Observable<SchemaValidator> {
    const schemaInfo: SchemaInfo = {
      smartDefaultRecord: new Map<string, JsonObject>(),
      promptDefinitions: [],
    };

    this._ajv.removeSchema(schema);

    // Supports both synchronous and asynchronous compilation, by trying the synchronous
    // version first, then if refs are missing this will fails.
    // We also add any refs from external fetched schemas so that those will also be used
    // in synchronous (if available).
    let validator: Observable<ajv.ValidateFunction>;
    try {
      this._currentCompilationSchemaInfo = schemaInfo;
      validator = of(this._ajv.compile(schema));
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
        map(validate => (data: JsonValue, options?: SchemaValidatorOptions) => {
          const validationOptions: SchemaValidatorOptions = {
            withPrompts: true,
            applyPostTransforms: true,
            applyPreTransforms: true,
            ...options,
          };
          const validationContext = {
            promptFieldsWithValue: new Set<string>(),
          };

          let result = of(data);
          if (validationOptions.applyPreTransforms) {
            // tslint:disable-next-line:no-any https://github.com/ReactiveX/rxjs/issues/3989
            result = (result as any).pipe(
              ...[...this._pre].map(visitor => concatMap((data: JsonValue) => {
                return visitJson(data, visitor, schema, this._resolver, validate);
              })),
            );
          }

          return result.pipe(
            switchMap(updateData => this._applySmartDefaults(
              updateData,
              schemaInfo.smartDefaultRecord,
            )),
            switchMap(updatedData => {
              if (validationOptions.withPrompts === false) {
                return of(updatedData);
              }

              const visitor: JsonVisitor = (value, pointer) => {
                if (value !== undefined) {
                  validationContext.promptFieldsWithValue.add(pointer);
                }

                return value;
              };
              if (schema === false || schema === true) {
                return of(updatedData);
              }

              return visitJson(updatedData, visitor, schema, this._resolver, validate);
            }),
            switchMap(updatedData => {
              if (validationOptions.withPrompts === false) {
                return of(updatedData);
              }

              const definitions = schemaInfo.promptDefinitions
                .filter(def => !validationContext.promptFieldsWithValue.has(def.id));

              if (this._promptProvider && definitions.length > 0) {
                return from(this._applyPrompts(updatedData, definitions));
              } else {
                return of(updatedData);
              }
            }),
            switchMap(updatedData => {
              const result = validate.call(validationContext, updatedData);

              return typeof result == 'boolean'
                ? of([updatedData, result])
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
              if (valid) {
                let result = of(data);

                if (validationOptions.applyPostTransforms) {
                  // tslint:disable-next-line:no-any https://github.com/ReactiveX/rxjs/issues/3989
                  result = (result as any).pipe(
                    ...[...this._post].map(visitor => concatMap((data: JsonValue) => {
                      return visitJson(data, visitor, schema, this._resolver, validate);
                    })),
                  );
                }

                return result.pipe(
                  map(data => [data, valid]),
                );
              } else {
                return of([data, valid]);
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
          if (compilationSchemInfo === undefined) {
            return () => true;
          }

          // We cheat, heavily.
          compilationSchemInfo.smartDefaultRecord.set(
            // tslint:disable-next-line:no-any
            JSON.stringify((it as any).dataPathArr.slice(1, (it as any).dataLevel + 1) as string[]),
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

  registerUriHandler(handler: UriHandler) {
    this._uriHandlers.add(handler);
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
          return () => true;
        }

        // tslint:disable-next-line:no-any
        const pathArray = ((it as any).dataPathArr as string[]).slice(1, it.dataLevel + 1);
        const path = '/' + pathArray.map(p => p.replace(/^\'/, '').replace(/\'$/, '')).join('/');

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

        const propertyTypes = getTypesOfSchema(parentSchema);
        if (!type) {
          if (propertyTypes.size === 1 && propertyTypes.has('boolean')) {
            type = 'confirmation';
          } else if (Array.isArray(parentSchema.enum)) {
            type = 'list';
          } else if (
            propertyTypes.size === 1 &&
            propertyTypes.has('array') &&
            parentSchema.items &&
            Array.isArray((parentSchema.items as JsonObject).enum)
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
            ? parentSchema.items && (parentSchema.items as JsonObject).enum
            : parentSchema.enum;
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
          default: typeof parentSchema.default == 'object' ? undefined : parentSchema.default,
          async validator(data: JsonValue) {
            try {
              return await it.self.validate(parentSchema, data);
            } catch {
              return false;
            }
          },
        };

        compilationSchemInfo.promptDefinitions.push(definition);

        return function(this: { promptFieldsWithValue: Set<string> }) {
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
            required: [ 'message' ],
          },
        ],
      },
    });
  }

  private _applyPrompts<T>(data: T, prompts: Array<PromptDefinition>): Observable<T> {
    const provider = this._promptProvider;
    if (!provider) {
      return of(data);
    }

    return from(provider(prompts)).pipe(
      map(answers => {
        for (const path in answers) {
          const pathFragments = path.split('/').map(pf => {
            if (/^\d+$/.test(pf)) {
              return pf;
            } else {
              return '\'' + pf + '\'';
            }
          });

          CoreSchemaRegistry._set(
            data,
            pathFragments.slice(1),
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
    // tslint:disable-next-line:no-any https://github.com/ReactiveX/rxjs/issues/3989
    return (of(data) as any).pipe(
      ...[...smartDefaults.entries()].map(([pointer, schema]) => {
        return concatMap(data => {
          const fragments = JSON.parse(pointer);
          const source = this._sourceMap.get((schema as JsonObject).$source as string);

          let value = source ? source(schema) : of(undefined);

          if (!isObservable(value)) {
            value = of(value);
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

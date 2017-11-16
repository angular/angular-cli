/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonArray, JsonObject } from '@angular-devkit/core';
import * as ajv from 'ajv';
import * as http from 'http';
import { Observable } from 'rxjs/Observable';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { map } from 'rxjs/operators/map';
import {
  OptionsSchemaRegistry,
  OptionsSchemaValidator,
  OptionsSchemaValidatorResult,
} from './schema-option-transform';


function _parseJsonPointer(pointer: string): string[] {
  if (pointer === '') { return []; }
  if (pointer.charAt(0) !== '/') { throw new Error('Invalid JSON pointer: ' + pointer); }

  return pointer.substring(1).split(/\//).map(str => str.replace(/~1/g, '/').replace(/~0/g, '~'));
}


interface JsonVisitor {
  (
    current: JsonObject | JsonArray,
    pointer: string,
    parentSchema?: JsonObject | JsonArray,
    index?: string,
  ): void;
}


function _visitJsonSchema(schema: JsonObject, visitor: JsonVisitor) {
  const keywords = {
    additionalItems: true,
    items: true,
    contains: true,
    additionalProperties: true,
    propertyNames: true,
    not: true,
  };

  const propsKeywords = {
    definitions: true,
    properties: true,
    patternProperties: true,
    dependencies: true,
  };

  function _traverse(
    schema: JsonObject | JsonArray,
    jsonPtr: string,
    rootSchema: JsonObject,
    parentSchema?: JsonObject | JsonArray,
    keyIndex?: string,
  ) {
    if (schema && typeof schema == 'object' && !Array.isArray(schema)) {
      visitor(schema, jsonPtr, parentSchema, keyIndex);

      for (const key of Object.keys(schema)) {
        const sch = schema[key];
        if (Array.isArray(sch)) {
          if (key == 'items') {
            for (let i = 0; i < sch.length; i++) {
              _traverse(
                sch[i] as JsonArray,
                jsonPtr + '/' + key + '/' + i,
                rootSchema,
                schema,
                '' + i,
              );
            }
          }
        } else if (key in propsKeywords) {
          if (sch && typeof sch == 'object') {
            for (const prop of Object.keys(sch)) {
              _traverse(
                sch[prop] as JsonObject,
                jsonPtr + '/' + key + '/' + prop.replace(/~/g, '~0').replace(/\//g, '~1'),
                rootSchema,
                schema,
                prop,
              );
            }
          }
        } else if (key in keywords) {
          _traverse(sch as JsonObject, jsonPtr + '/' + key, rootSchema, schema, key);
        }
      }
    }
  }

  _traverse(schema, '', schema);
}


export class AjvSchemaRegistry implements OptionsSchemaRegistry {
  private _ajv: ajv.Ajv;
  private _uriCache = new Map<string, JsonObject>();

  constructor() {
    /**
     * Build an AJV instance that will be used to validate schemas.
     */
    this._ajv = ajv({
      removeAdditional: 'all',
      useDefaults: true,
      loadSchema: (uri: string) => this._fetch(uri) as ajv.Thenable<object>,
    });

    this._ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
  }

  private _clean(
    data: any,  // tslint:disable-line:no-any
    schema: JsonObject,
    validate: ajv.ValidateFunction,
    parentDataCache: WeakMap<object, any>,  // tslint:disable-line:no-any
  ) {
    _visitJsonSchema(
      schema,
      (currentSchema: object, pointer: string, parentSchema?: object, index?: string) => {
      // If we're at the root, skip.
      if (parentSchema === undefined || index === undefined) {
        return;
      }

      const parsedPointer = _parseJsonPointer(pointer);
      // Every other path fragment is either 'properties', 'items', 'allOf', ...
      const nonPropertyParsedPP = parsedPointer.filter((_, i) => !(i % 2));
      // Skip if it's part of a definitions or too complex for us to analyze.
      if (nonPropertyParsedPP.some(f => f == 'definitions' || f == 'allOf' || f == 'anyOf')) {
        return;
      }

      let maybeParentData = parentDataCache.get(parentSchema);
      if (!maybeParentData) {
        // Every other path fragment is either 'properties' or 'items' in this model.
        const parentDataPointer = parsedPointer.filter((_, i) => i % 2);

        // Find the parentData from the list.
        maybeParentData = data;
        for (const index of parentDataPointer.slice(0, -1)) {
          if (maybeParentData[index] === undefined) {
            // tslint:disable-next-line:no-any
            if (parentSchema.hasOwnProperty('items') || (parentSchema as any)['type'] == 'array') {
              maybeParentData[index] = [];
            } else {
              maybeParentData[index] = {};
            }
          }
          maybeParentData = maybeParentData[index];
        }
        parentDataCache.set(parentSchema, maybeParentData);
      }

      if (currentSchema.hasOwnProperty('$ref')) {
        const $ref = (currentSchema as { $ref: string })['$ref'];
        const refHash = $ref.split('#', 2)[1];
        const refUrl = $ref.startsWith('#') ? $ref : $ref.split('#', 1);

        let refVal = validate;
        if (!$ref.startsWith('#')) {
          // tslint:disable-next-line:no-any
          refVal = (validate.refVal as any)[(validate.refs as any)[refUrl[0]]];
        }
        if (refHash) {
          // tslint:disable-next-line:no-any
          refVal = (refVal.refVal as any)[(refVal.refs as any)['#' + refHash]];
        }

        maybeParentData[index] = {};
        this._clean(maybeParentData[index], refVal.schema as JsonObject, refVal, parentDataCache);

        return;
      } else if (!maybeParentData.hasOwnProperty(index)) {
        maybeParentData[index] = undefined;
      }
    });
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

  compile(schema: Object): Observable<OptionsSchemaValidator> {
    // Supports both synchronous and asynchronous compilation, by trying the synchronous
    // version first, then if refs are missing this will fails.
    // We also add any refs from external fetched schemas so that those will also be used
    // in synchronous (if available).
    let validator: Observable<ajv.ValidateFunction>;
    try {
      const maybeFnValidate = this._ajv.compile(schema);
      validator = Observable.of(maybeFnValidate);
    } catch (e) {
      // Propagate the error.
      if (!(e instanceof (ajv.MissingRefError as {} as Function))) {
        throw e;
      }

      validator = new Observable(obs => {
        this._ajv.compileAsync(schema)
          .then(validate => {
            obs.next(validate);
            obs.complete();
          }, err => {
            obs.error(err);
          });
      });
    }

    return validator
      .pipe(
        // tslint:disable-next-line:no-any
        map(validate => (data: any): Observable<OptionsSchemaValidatorResult> => {
          const result = validate(data);
          const resultObs = typeof result == 'boolean'
            ? Observable.of(result)
            : fromPromise(result as PromiseLike<boolean>);

          return resultObs
            .pipe(
              map(result => {
                if (result) {
                  // tslint:disable-next-line:no-any
                  const schemaDataMap = new WeakMap<object, any>();
                  schemaDataMap.set(schema, data);

                  this._clean(data, schema as JsonObject, validate, schemaDataMap);

                  return { success: true } as OptionsSchemaValidatorResult;
                }

                return {
                  success: false,
                  errors: (validate.errors || []).map((err: ajv.ErrorObject) => err.message),
                } as OptionsSchemaValidatorResult;
              }),
            );
        }),
      );
  }
}

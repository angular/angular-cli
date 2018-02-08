/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ajv from 'ajv';
import * as http from 'http';
import { Observable } from 'rxjs/Observable';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { of as observableOf } from 'rxjs/observable/of';
import { concatMap, switchMap } from 'rxjs/operators';
import { map } from 'rxjs/operators/map';
import { PartiallyOrderedSet } from '../../utils';
import { JsonObject, JsonValue } from '../interface';
import {
  SchemaFormat,
  SchemaFormatter,
  SchemaRegistry,
  SchemaValidator,
  SchemaValidatorResult,
} from './interface';
import { JsonPointer, JsonVisitor, parseJsonPointer, visitJson, visitJsonSchema } from './visitor';


export class CoreSchemaRegistry implements SchemaRegistry {
  private _ajv: ajv.Ajv;
  private _uriCache = new Map<string, JsonObject>();
  private _pre = new PartiallyOrderedSet<JsonVisitor>();

  constructor(formats: SchemaFormat[] = []) {
    /**
     * Build an AJV instance that will be used to validate schemas.
     */

    const formatsObj: { [name: string]: SchemaFormatter } = {};

    for (const format of formats) {
      formatsObj[format.name] = format.formatter;
    }

    this._ajv = ajv({
      removeAdditional: 'all',
      useDefaults: true,
      formats: formatsObj,
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
    visitJsonSchema(
      schema,
      (currentSchema: object, pointer: JsonPointer, parentSchema?: object, index?: string) => {
      // If we're at the root, skip.
      if (parentSchema === undefined || index === undefined) {
        return;
      }

      const parsedPointer = parseJsonPointer(pointer);
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

  /**
   * Add a transformation step before the validation of any Json.
   * @param {JsonVisitor} visitor The visitor to transform every value.
   * @param {JsonVisitor[]} deps A list of other visitors to run before.
   */
  addPreTransform(visitor: JsonVisitor, deps?: JsonVisitor[]) {
    this._pre.add(visitor, deps);
  }

  compile(schema: Object): Observable<SchemaValidator> {
    // Supports both synchronous and asynchronous compilation, by trying the synchronous
    // version first, then if refs are missing this will fails.
    // We also add any refs from external fetched schemas so that those will also be used
    // in synchronous (if available).
    let validator: Observable<ajv.ValidateFunction>;
    try {
      const maybeFnValidate = this._ajv.compile(schema);
      validator = observableOf(maybeFnValidate);
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
        map(validate => (data: any): Observable<SchemaValidatorResult> => {
          let dataObs = observableOf(data);
          this._pre.forEach(visitor =>
            dataObs = dataObs.pipe(
              concatMap(data => visitJson(data as JsonValue, visitor)),
            ),
          );

          return dataObs.pipe(
            switchMap(updatedData => {
              const result = validate(updatedData);

              return typeof result == 'boolean'
                ? observableOf([updatedData, result])
                : fromPromise((result as PromiseLike<boolean>)
                  .then(result => [updatedData, result]));
            }),
            map(([data, valid]) => {
              if (valid) {
                // tslint:disable-next-line:no-any
                const schemaDataMap = new WeakMap<object, any>();
                schemaDataMap.set(schema, data);

                this._clean(data, schema as JsonObject, validate, schemaDataMap);

                return { data, success: true } as SchemaValidatorResult;
              }

              return {
                data,
                success: false,
                errors: (validate.errors || [])
                  .map((err: ajv.ErrorObject) => `${err.dataPath} ${err.message}`),
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

      return result instanceof Observable ? result.toPromise() : result;
    };

    this._ajv.addFormat(format.name, {
      async: format.formatter.async,
      validate,
    // AJV typings list `compare` as required, but it is optional.
    // tslint:disable-next-line:no-any
    } as any);
  }
}

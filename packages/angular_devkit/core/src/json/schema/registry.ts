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
import { addUndefinedDefaults } from './transforms';
import { JsonVisitor, visitJson } from './visitor';


export class CoreSchemaRegistry implements SchemaRegistry {
  private _ajv: ajv.Ajv;
  private _uriCache = new Map<string, JsonObject>();
  private _pre = new PartiallyOrderedSet<JsonVisitor>();
  private _post = new PartiallyOrderedSet<JsonVisitor>();

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
    if (!validate) {
      return {};
    }

    const refHash = ref.split('#', 2)[1];
    const refUrl = ref.startsWith('#') ? ref : ref.split('#', 1);

    if (!ref.startsWith('#')) {
      // tslint:disable-next-line:no-any
      validate = (validate.refVal as any)[(validate.refs as any)[refUrl[0]]];
    }
    if (validate && refHash) {
      // tslint:disable-next-line:no-any
      validate = (validate.refVal as any)[(validate.refs as any)['#' + refHash]];
    }

    return { context: validate, schema: validate && validate.schema as JsonObject };
  }

  compile(schema: JsonObject): Observable<SchemaValidator> {
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
              concatMap(data => {
                return visitJson(data as JsonValue, visitor, schema, this._resolver, validate);
              }),
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
            switchMap(([data, valid]) => {
              if (valid) {
                let dataObs = observableOf(data);
                this._post.forEach(visitor =>
                  dataObs = dataObs.pipe(
                    concatMap(data => {
                      return visitJson(
                        data as JsonValue,
                        visitor,
                        schema,
                        this._resolver,
                        validate,
                      );
                    }),
                  ),
                );

                return dataObs.pipe(
                  map(data => [data, valid]),
                );
              } else {
                return observableOf([data, valid]);
              }
            }),
            map(([data, valid]) => {
              if (valid) {
                // tslint:disable-next-line:no-any
                const schemaDataMap = new WeakMap<object, any>();
                schemaDataMap.set(schema, data);

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

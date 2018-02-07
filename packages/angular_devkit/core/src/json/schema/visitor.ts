/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs/Observable';
import { from } from 'rxjs/observable/from';
import { of as observableOf } from 'rxjs/observable/of';
import { concat, concatMap, ignoreElements, mergeMap, tap } from 'rxjs/operators';
import { observable } from 'rxjs/symbol/observable';
import { JsonArray, JsonObject, JsonValue } from '..';

export type JsonPointer = string & {
  __PRIVATE_DEVKIT_JSON_POINTER: void;
};

export interface JsonSchemaVisitor {
  (
    current: JsonObject | JsonArray,
    pointer: JsonPointer,
    parentSchema?: JsonObject | JsonArray,
    index?: string,
  ): void;
}

export interface JsonVisitor {
  (
    value: JsonValue | undefined,
    pointer: JsonPointer,
    root?: JsonObject | JsonArray,
  ): Observable<JsonValue | undefined> | JsonValue | undefined;
}


export function buildJsonPointer(fragments: string[]): JsonPointer {
  return (
    '/' + fragments.map(f => {
      return f.replace(/~/g, '~0')
              .replace(/\//g, '~1');
    }).join('/')
  ) as JsonPointer;
}
export function joinJsonPointer(root: JsonPointer, ...others: string[]): JsonPointer {
  if (root == '/') {
    return buildJsonPointer(others);
  }

  return (root + buildJsonPointer(others)) as JsonPointer;
}
export function parseJsonPointer(pointer: JsonPointer): string[] {
  if (pointer === '') { return []; }
  if (pointer.charAt(0) !== '/') { throw new Error('Relative pointer: ' + pointer); }

  return pointer.substring(1).split(/\//).map(str => str.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function _visitJsonRecursive(
  json: JsonValue,
  visitor: JsonVisitor,
  ptr: JsonPointer,
  root?: JsonObject | JsonArray,
): Observable<JsonValue | undefined> {
  const value = visitor(json, ptr, root);

  return (
    (typeof value == 'object' && value != null && observable in value)
      ? value as Observable<JsonValue | undefined>
      : observableOf(value as JsonValue | undefined)
  ).pipe(
    concatMap((value: JsonValue | undefined) => {
      if (Array.isArray(value)) {
        return from(value).pipe(
          mergeMap((item, i) => {
            return _visitJsonRecursive(
              item,
              visitor,
              joinJsonPointer(ptr, '' + i),
              root || value,
            ).pipe(tap<JsonValue>(x => value[i] = x));
          }),
          ignoreElements(),
          concat(observableOf(value)),
        );
      } else if (typeof value == 'object' && value !== null) {
        return from(Object.getOwnPropertyNames(value)).pipe(
          mergeMap(key => {
            return _visitJsonRecursive(
              value[key],
              visitor,
              joinJsonPointer(ptr, key),
              root || value,
            ).pipe(tap<JsonValue>(x => value[key] = x));
          }),
          ignoreElements(),
          concat(observableOf(value)),
        );
      } else {
        return observableOf(value);
      }
    }),
  );
}

/**
 * Visit all the properties in a JSON object, allowing to transform them. It supports calling
 * properties synchronously or asynchronously (through Observables).
 * The original object can be mutated or replaced entirely.
 *
 * @param {JsonValue} json The Json value to visit.
 * @param {JsonVisitor} visitor A function that will be called on every items.
 * @returns {Observable< | undefined>} The observable of the new root, if the root changed.
 */
export function visitJson(
  json: JsonValue,
  visitor: JsonVisitor,
): Observable<JsonValue | undefined> {
  return _visitJsonRecursive(json, visitor, buildJsonPointer([]));
}


export function visitJsonSchema(schema: JsonObject, visitor: JsonSchemaVisitor) {
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
    jsonPtr: JsonPointer,
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
                joinJsonPointer(jsonPtr, key, '' + i),
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
                joinJsonPointer(jsonPtr, key, prop),
                rootSchema,
                schema,
                prop,
              );
            }
          }
        } else if (key in keywords) {
          _traverse(sch as JsonObject, joinJsonPointer(jsonPtr, key), rootSchema, schema, key);
        }
      }
    }
  }

  _traverse(schema, buildJsonPointer([]), schema);
}

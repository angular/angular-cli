/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, concat, from, of as observableOf } from 'rxjs';
import { concatMap, ignoreElements, mergeMap, tap } from 'rxjs/operators';
import { JsonArray, JsonObject, JsonValue } from '..';
import { isObservable } from '../../utils';
import { JsonPointer } from './interface';
import { buildJsonPointer, joinJsonPointer } from './pointer';

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
    value: JsonValue,
    pointer: JsonPointer,
    schema?: JsonObject,
    root?: JsonObject | JsonArray,
  ): Observable<JsonValue> | JsonValue;
}


export interface ReferenceResolver<ContextT> {
  (ref: string, context?: ContextT): { context?: ContextT, schema?: JsonObject };
}

function _getObjectSubSchema(
  schema: JsonObject | undefined,
  key: string,
): JsonObject | undefined {
  if (typeof schema !== 'object' || schema === null) {
    return undefined;
  }

  // Is it an object schema?
  if (typeof schema.properties == 'object' || schema.type == 'object') {
    if (typeof schema.properties == 'object'
        && typeof (schema.properties as JsonObject)[key] == 'object') {
      return (schema.properties as JsonObject)[key] as JsonObject;
    }
    if (typeof schema.additionalProperties == 'object') {
      return schema.additionalProperties as JsonObject;
    }

    return undefined;
  }

  // Is it an array schema?
  if (typeof schema.items == 'object' || schema.type == 'array') {
    return typeof schema.items == 'object' ? (schema.items as JsonObject) : undefined;
  }

  return undefined;
}

function _visitJsonRecursive<ContextT>(
  json: JsonValue,
  visitor: JsonVisitor,
  ptr: JsonPointer,
  schema?: JsonObject,
  refResolver?: ReferenceResolver<ContextT>,
  context?: ContextT,  // tslint:disable-line:no-any
  root?: JsonObject | JsonArray,
): Observable<JsonValue> {
  if (schema && schema.hasOwnProperty('$ref') && typeof schema['$ref'] == 'string') {
    if (refResolver) {
      const resolved = refResolver(schema['$ref'] as string, context);
      schema = resolved.schema;
      context = resolved.context;
    }
  }

  const value = visitor(json, ptr, schema, root);

  return (isObservable(value)
      ? value as Observable<JsonValue>
      : observableOf(value as JsonValue)
  ).pipe(
    concatMap((value: JsonValue) => {
      if (Array.isArray(value)) {
        return concat(
          from(value).pipe(
            mergeMap((item, i) => {
              return _visitJsonRecursive(
                item,
                visitor,
                joinJsonPointer(ptr, '' + i),
                _getObjectSubSchema(schema, '' + i),
                refResolver,
                context,
                root || value,
              ).pipe(tap<JsonValue>(x => value[i] = x));
            }),
            ignoreElements(),
          ),
          observableOf(value),
        );
      } else if (typeof value == 'object' && value !== null) {
        return concat(
          from(Object.getOwnPropertyNames(value)).pipe(
            mergeMap(key => {
              return _visitJsonRecursive(
                value[key],
                visitor,
                joinJsonPointer(ptr, key),
                _getObjectSubSchema(schema, key),
                refResolver,
                context,
                root || value,
              ).pipe(tap<JsonValue>(x => value[key] = x));
            }),
            ignoreElements(),
           ),
           observableOf(value),
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
 * The original object can be mutated or replaced entirely. In case where it's replaced, the new
 * value is returned. When it's mutated though the original object will be changed.
 *
 * Please note it is possible to have an infinite loop here (which will result in a stack overflow)
 * if you return 2 objects that references each others (or the same object all the time).
 *
 * @param {JsonValue} json The Json value to visit.
 * @param {JsonVisitor} visitor A function that will be called on every items.
 * @param {JsonObject} schema A JSON schema to pass through to the visitor (where possible).
 * @param refResolver a function to resolve references in the schema.
 * @returns {Observable< | undefined>} The observable of the new root, if the root changed.
 */
export function visitJson<ContextT>(
  json: JsonValue,
  visitor: JsonVisitor,
  schema?: JsonObject,
  refResolver?: ReferenceResolver<ContextT>,
  context?: ContextT,  // tslint:disable-line:no-any
): Observable<JsonValue> {
  return _visitJsonRecursive(json, visitor, buildJsonPointer([]), schema, refResolver, context);
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
    additionalProperties: true,
    dependencies: true,
    items: true,
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

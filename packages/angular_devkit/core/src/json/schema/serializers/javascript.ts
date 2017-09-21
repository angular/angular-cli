/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException } from '../../../exception/exception';
import { camelize, classify } from '../../../utils/strings';
import { JsonSchemaRegistry } from '../registry';
import { JsonSchema } from '../schema';
import { JsonSchemaSerializer } from './interface';


export class InvalidRangeException<T> extends BaseException {
  constructor(name: string, value: T, comparator: string, expected: T) {
    super(`Property ${JSON.stringify(name)} expected a value `
      + `${comparator} ${JSON.stringify(expected)}, received ${JSON.stringify(value)}.`);
  }
}
export class InvalidValueException extends BaseException {
  constructor(name: string, value: {}, expected: string) {
    super(`Property ${JSON.stringify(name)} expected a value of type ${expected}, `
        + `received ${value}.`);
  }
}
export class InvalidSchemaException extends BaseException {
  constructor(schema: JsonSchema) {
    super(`Invalid schema: ${JSON.stringify(schema)}`);
  }
}
export class InvalidPropertyNameException extends BaseException {
  constructor(public readonly path: string) {
    super(`Property ${JSON.stringify(path)} does not exist in the schema, and no additional `
        + `properties are allowed.`);
  }
}
export class RequiredValueMissingException extends BaseException {
  constructor(public readonly path: string) {
    super(`Property ${JSON.stringify(path)} is required but missing.`);
  }
}


const exceptions = {
  InvalidRangeException,
  InvalidSchemaException,
  InvalidValueException,
  InvalidPropertyNameException,
  RequiredValueMissingException,
};


const symbols = {
  Schema: Symbol('schema'),
};


export interface JavascriptSerializerOptions {
  // Do not throw an exception if an extra property is passed, simply ignore it.
  ignoreExtraProperties?: boolean;
  // Allow accessing undefined objects, which might have default property values.
  allowAccessUndefinedObjects?: boolean;
}


export class JavascriptSerializer<T> extends JsonSchemaSerializer<(value: T) => T> {
  private _uniqueSet = new Set<string>();

  constructor(private _options?: JavascriptSerializerOptions) { super(); }

  protected _unique(name: string) {
    let i = 1;
    let result = name;
    while (this._uniqueSet.has(result)) {
      result = name + i;
      i++;
    }
    this._uniqueSet.add(result);

    return result;
  }

  serialize(ref: string, registry: JsonSchemaRegistry) {
    const rootSchema = registry.getSchemaFromRef(ref);
    const { root, templates } = require('./templates/javascript');

    const source = root({
      exceptions,
      name: '',
      options: this._options || {},
      schema: rootSchema,
      strings: {
        classify,
        camelize,
      },
      symbols,
      templates,
    });

    const fn = new Function('registry', 'exceptions', 'symbols', 'value', source);

    return (value: T) => fn(registry, exceptions, symbols, value);
  }
}

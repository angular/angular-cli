/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export const templates: { [name: string]: (value: {}) => string } = {
  subschema: require('./subschema').default,

  prop_any: require('./prop-any').default,
  prop_array: require('./prop-array').default,
  prop_boolean: require('./prop-boolean').default,
  prop_number: require('./prop-number').default,
  prop_integer: require('./prop-number').default,
  prop_object: require('./prop-object').default,
  prop_string: require('./prop-string').default,
};

export const root = require('./root').default as (value: {}) => string;

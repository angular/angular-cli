/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { json } from '@angular-devkit/core';

import { BuilderInput } from './api';

type OverrideOptions = BuilderInput['options'];

export function mergeOptions(
  baseOptions: json.JsonObject,
  overrideOptions: OverrideOptions,
): json.JsonObject {
  if (!overrideOptions) {
    return { ...baseOptions };
  }

  const options = {
    ...baseOptions,
    ...overrideOptions,
  };

  // For object-object overrides, we merge one layer deep.
  for (const key of Object.keys(overrideOptions)) {
    const override = overrideOptions[key];
    const base = baseOptions[key];

    if (json.isJsonObject(base) && json.isJsonObject(override)) {
      options[key] = { ...base, ...override };
    }
  }

  return options;
}

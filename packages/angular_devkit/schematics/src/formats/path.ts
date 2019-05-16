/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { normalize, schema } from '@angular-devkit/core';


export const pathFormat: schema.SchemaFormat = {
  name: 'path',
  formatter: {
    async: false,
    validate: (path: string) => {
      // Check path is normalized already.
      return path === normalize(path);
      // TODO: check if path is valid (is that just checking if it's normalized?)
      // TODO: check path is from root of schematics even if passed absolute
      // TODO: error out if path is outside of host
    },
  },
};

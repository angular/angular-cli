/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { schema } from '@angular-devkit/core';
import { htmlSelectorRe } from './html-selector';


const unsupportedProjectNames = ['test', 'ember', 'ember-cli', 'vendor', 'app'];

export const appNameFormat: schema.SchemaFormat = {
  name: 'app-name',
  formatter: {
    async: false,
    validate: (appName: string) => htmlSelectorRe.test(appName)
      && unsupportedProjectNames.indexOf(appName) === -1,
  },
};

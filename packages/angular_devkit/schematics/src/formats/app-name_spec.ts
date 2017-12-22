/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { appNameFormat } from './app-name';
import { formatValidator } from './format-validator';


describe('Schematics app name format', () => {
  it('accepts correct app name', done => {
    const data = { appName: 'my-app' };
    const dataSchema = {
      properties: { appName: { type: 'string', format: 'app-name' } },
    };

    formatValidator(data, dataSchema, [appNameFormat])
      .map(result => expect(result.success).toBe(true))
      .subscribe(done, done.fail);
  });

  it('rejects app name starting with invalid characters', done => {
    const data = { appName: 'my-app$' };
    const dataSchema = {
      properties: { appName: { type: 'string', format: 'app-name' } },
    };

    formatValidator(data, dataSchema, [appNameFormat])
      .map(result => expect(result.success).toBe(false))
      .subscribe(done, done.fail);
  });

  it('rejects app name starting with number', done => {
    const data = { appName: '1app' };
    const dataSchema = {
      properties: { appName: { type: 'string', format: 'app-name' } },
    };

    formatValidator(data, dataSchema, [appNameFormat])
      .map(result => expect(result.success).toBe(false))
      .subscribe(done, done.fail);
  });

  it('rejects unsupported app names', done => {
    const data = {
      appName1: 'test',
      appName2: 'ember',
      appName3: 'ember-cli',
      appName4: 'vendor',
      appName5: 'app',
    };
    const dataSchema = {
      properties: {
        appName1: { type: 'string', format: 'app-name' },
        appName2: { type: 'string', format: 'app-name' },
        appName3: { type: 'string', format: 'app-name' },
        appName4: { type: 'string', format: 'app-name' },
        appName5: { type: 'string', format: 'app-name' },
      },
    };

    formatValidator(data, dataSchema, [appNameFormat])
      .map(result => expect(result.success).toBe(false))
      .subscribe(done, done.fail);
  });
});

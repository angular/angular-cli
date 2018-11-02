/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 */
import { schema } from '@angular-devkit/core';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CommandJsonPathException, parseJsonSchemaToCommandDescription } from './json-schema';

describe('parseJsonSchemaToCommandDescription', () => {
  let registry: schema.CoreSchemaRegistry;
  const baseSchemaJson = {
    '$schema': 'http://json-schema.org/schema',
    '$id': 'ng-cli://commands/version.json',
    'description': 'Outputs Angular CLI version.',
    '$longDescription': 'not a file ref',

    '$aliases': ['v'],
    '$scope': 'all',
    '$impl': './version-impl#VersionCommand',

    'type': 'object',
    'allOf': [
      { '$ref': './definitions.json#/definitions/base' },
    ],
  };

  beforeEach(() => {
    registry = new schema.CoreSchemaRegistry([]);
    registry.registerUriHandler((uri: string) => {
      if (uri.startsWith('ng-cli://')) {
        const content = readFileSync(
          join(__dirname, '..', uri.substr('ng-cli://'.length)), 'utf-8');

        return Promise.resolve(JSON.parse(content));
      } else {
        return null;
      }
    });
  });

  it(`should throw on invalid $longDescription path`, async () => {
    const name = 'version';
    const schemaPath = join(__dirname, './bad-sample.json');
    const schemaJson = { ...baseSchemaJson, $longDescription: 'not a file ref' };
    try {
      await parseJsonSchemaToCommandDescription(name, schemaPath, registry, schemaJson);
    } catch (error) {
      const refPath = join(__dirname, schemaJson.$longDescription);
      expect(error).toEqual(new CommandJsonPathException(refPath, name));

      return;
    }
    expect(true).toBe(false, 'function should have thrown');
  });

  it(`should throw on invalid $usageNotes path`, async () => {
    const name = 'version';
    const schemaPath = join(__dirname, './bad-sample.json');
    const schemaJson = { ...baseSchemaJson, $usageNotes: 'not a file ref' };
    try {
      await parseJsonSchemaToCommandDescription(name, schemaPath, registry, schemaJson);
    } catch (error) {
      const refPath = join(__dirname, schemaJson.$usageNotes);
      expect(error).toEqual(new CommandJsonPathException(refPath, name));

      return;
    }
    expect(true).toBe(false, 'function should have thrown');
  });
});

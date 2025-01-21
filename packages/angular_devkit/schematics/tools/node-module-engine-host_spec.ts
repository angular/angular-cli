/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SchematicEngine } from '../index';
import { NodeModulesEngineHost } from './node-module-engine-host';

const TMP_DIR = process.env['TEST_TMPDIR'] || os.tmpdir();

describe('NodeModulesEngineHost', () => {
  let tmpDir!: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(TMP_DIR, 'angular-devkit-schematics-tools-node-module-engine-host'),
    );
  });

  /** Creates a fake NPM module that can be used to test the node module engine host. */
  function createFakeNpmModule() {
    fs.mkdirSync(path.join(tmpDir, 'node_modules'));
    fs.mkdirSync(path.join(tmpDir, 'node_modules/@angular/'));
    fs.mkdirSync(path.join(tmpDir, 'node_modules/@angular/core'));
    fs.mkdirSync(path.join(tmpDir, 'node_modules/@angular/core/schematics'));
    fs.writeFileSync(
      path.join(tmpDir, 'node_modules/@angular/core/package.json'),
      JSON.stringify({ name: '@angular/core' }),
    );
    fs.writeFileSync(
      path.join(tmpDir, 'node_modules/@angular/core/schematics/migrations.json'),
      JSON.stringify({ schematics: {} }),
    );
  }

  it('should properly create collections with explicit collection path', () => {
    createFakeNpmModule();

    const engineHost = new NodeModulesEngineHost([tmpDir]);
    const engine = new SchematicEngine(engineHost);

    expect(() => {
      engine.createCollection(path.join('@angular/core', './schematics/migrations.json'));
    }).not.toThrow();
  });
});

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-any
// tslint:disable:no-implicit-dependencies
import { SchematicEngine } from '@angular-devkit/schematics';
import { FileSystemEngineHost } from '@angular-devkit/schematics/tools';
import * as path from 'path';

describe('FileSystemEngineHost', () => {
  const devkitRoot = (global as any)._DevKitRoot;
  const root = path.join(
    devkitRoot,
    'tests/@angular_devkit/schematics/tools/file-system-engine-host',
  );

  it('works', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);

    const testCollection = engine.createCollection('works');
    const schematic1 = engine.createSchematic('schematic1', testCollection);

    expect(schematic1.description.name).toBe('schematic1');
  });

  it('understands aliases', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);

    const testCollection = engine.createCollection('aliases');
    const schematic1 = engine.createSchematic('alias1', testCollection);

    expect(schematic1).not.toBeNull();
    expect(schematic1.description.name).toBe('schematic1');
  });

  it('errors on invalid aliases', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);

    expect(() => engine.createCollection('invalid-aliases')).toThrow();
  });

  it('errors on invalid aliases (2)', () => {
    const engineHost = new FileSystemEngineHost(root);
    const engine = new SchematicEngine(engineHost);

    expect(() => engine.createCollection('invalid-aliases-2')).toThrow();
  });
});

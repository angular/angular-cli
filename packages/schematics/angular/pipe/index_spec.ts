/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Tree, VirtualTree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/test';
import * as path from 'path';
import { createAppModule, getFileContent } from '../utility/test';
import { Schema as PipeSchemna } from './schema';


describe('Pipe Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: PipeSchemna = {
    name: 'foo',
    path: 'app',
    sourceDir: 'src',
    spec: true,
    module: undefined,
    export: false,
    flat: true,
  };

  let appTree: Tree;

  beforeEach(() => {
    appTree = new VirtualTree();
    appTree = createAppModule(appTree);
  });

  it('should create a pipe', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('pipe', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/src/app/foo.pipe.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo.pipe.ts')).toBeGreaterThanOrEqual(0);
    const moduleContent = getFileContent(tree, '/src/app/app.module.ts');
    expect(moduleContent).toMatch(/import.*Foo.*from '.\/foo.pipe'/);
    expect(moduleContent).toMatch(/declarations:\s*\[[^\]]+?,\r?\n\s+FooPipe\r?\n/m);
  });

  it('should import into a specified module', () => {
    const options = { ...defaultOptions, module: 'app.module.ts' };

    const tree = schematicRunner.runSchematic('pipe', options, appTree);
    const appModule = getFileContent(tree, '/src/app/app.module.ts');

    expect(appModule).toMatch(/import { FooPipe } from '.\/foo.pipe'/);
  });

  it('should fail if specified module does not exist', () => {
    const options = { ...defaultOptions, module: '/src/app/app.moduleXXX.ts' };
    let thrownError: Error | null = null;
    try {
      schematicRunner.runSchematic('pipe', options, appTree);
    } catch (err) {
      thrownError = err;
    }
    expect(thrownError).toBeDefined();
  });

  it('should export the pipe', () => {
    const options = { ...defaultOptions, export: true };

    const tree = schematicRunner.runSchematic('pipe', options, appTree);
    const appModuleContent = getFileContent(tree, '/src/app/app.module.ts');
    expect(appModuleContent).toMatch(/exports: \[FooPipe\]/);
  });

  it('should respect the flat flag', () => {
    const options = { ...defaultOptions, flat: false };

    const tree = schematicRunner.runSchematic('pipe', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/src/app/foo/foo.pipe.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo/foo.pipe.ts')).toBeGreaterThanOrEqual(0);
    const moduleContent = getFileContent(tree, '/src/app/app.module.ts');
    expect(moduleContent).toMatch(/import.*Foo.*from '.\/foo\/foo.pipe'/);
    expect(moduleContent).toMatch(/declarations:\s*\[[^\]]+?,\r?\n\s+FooPipe\r?\n/m);
  });
});

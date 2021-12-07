/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ApplicationOptions, Style as AppStyle } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as SchematicOptions, Type } from './schema';

describe('Ng Schematic Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: SchematicOptions = {
    name: 'foo',
    // path: 'src/app',
    type: 'Generate' as Type,
    skipTests: false,
    project: 'bar',
  };

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  const appOptions: ApplicationOptions = {
    name: 'bar',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    style: AppStyle.Css,
    skipTests: false,
    skipPackageJson: false,
  };
  let appTree: UnitTestTree;
  beforeEach(async () => {
    appTree = await schematicRunner.runSchematicAsync('workspace', workspaceOptions).toPromise();
    appTree = await schematicRunner
      .runSchematicAsync('application', appOptions, appTree)
      .toPromise();
  });

  it('should create a schematic', async () => {
    const options = { ...defaultOptions };
    const tree = await schematicRunner.runSchematicAsync('schematic', options, appTree).toPromise();
    const files = tree.files;
    expect(files).toEqual(
      jasmine.arrayContaining([
        '/projects/bar/src/app/foo/foo.spec.ts',
        '/projects/bar/src/app/foo/foo.ts',
        '/projects/bar/src/app/foo/schema.json',
      ]),
    );
  });

  it('should create a flat schematic', async () => {
    const options = { ...defaultOptions, flat: true };

    const tree = await schematicRunner.runSchematicAsync('schematic', options, appTree).toPromise();
    const files = tree.files;
    expect(files).toEqual(
      jasmine.arrayContaining([
        '/projects/bar/src/app/foo.spec.ts',
        '/projects/bar/src/app/foo.ts',
        '/projects/bar/src/app/foo/schema.json',
      ]),
    );
  });

  it('should handle upper case paths', async () => {
    const pathOption = 'projects/bar/src/app/SOME/UPPER/DIR';
    const options = { ...defaultOptions, path: pathOption };

    const tree = await schematicRunner.runSchematicAsync('schematic', options, appTree).toPromise();
    let files = tree.files;
    let name = 'foo';
    let root = `/${pathOption}/${name}/${name}`;
    expect(files).toEqual(
      jasmine.arrayContaining([`${root}.spec.ts`, `${root}.ts`, `/${pathOption}/${name}/schema.json`]),
    );

    const options2 = { ...options, name: 'BAR' };
    const tree2 = await schematicRunner.runSchematicAsync('schematic', options2, tree).toPromise();
    files = tree2.files;
    name = 'bar';
    root = `/${pathOption}/${name}/${name}.component`;
    expect(files).toEqual(
      jasmine.arrayContaining([`${root}.spec.ts`, `${root}.ts`, `/${pathOption}/${name}/schema.json`]),
    );
  });

  it('should create a schematic in a sub-directory', async () => {
    const options = { ...defaultOptions, path: 'projects/bar/src/app/a/b/c' };

    const tree = await schematicRunner.runSchematicAsync('schematic', options, appTree).toPromise();
    const files = tree.files;
    const name = 'foo';
    const root = `/${options.path}/${name}/${name}`;
    expect(files).toEqual(
      jasmine.arrayContaining([`${root}.spec.ts`, `${root}.ts`, `/${options.path}/${name}/schema.json`]),
    );
  });

  it('TODO: test type input', async () => {
    expect(true).toBe(true);
  });

  it('should respect the skipTests option', async () => {
    const options = { ...defaultOptions, skipTests: true };
    const tree = await schematicRunner.runSchematicAsync('schematic', options, appTree).toPromise();
    const files = tree.files;

    expect(files).toEqual(
      jasmine.arrayContaining([
        '/projects/bar/src/app/foo/foo.ts',
        '/projects/bar/src/app/foo/schema.json',
      ]),
    );
    expect(tree.files).not.toContain('/projects/bar/src/app/foo/foo.spec.ts');
  });
});

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { parse as parseJson } from 'jsonc-parser';
import { Schema as LibraryOptions } from '../library/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as GenerateLibrarySchema } from './schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getJsonFileContent(tree: UnitTestTree, path: string): any {
  return parseJson(tree.readContent(path).toString());
}

describe('Secondary Entrypoint Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/ng_packagr',
    require.resolve('../collection.json'),
  );
  const defaultOptions: GenerateLibrarySchema = {
    name: 'foo-secondary',
    project: 'foo',
  };

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',

    version: '6.0.0',
  };
  const libaryOptions: LibraryOptions = {
    name: 'foo',
    standalone: true,
    skipPackageJson: false,
    skipTsConfig: false,
    skipInstall: false,
  };

  let workspaceTree: UnitTestTree;
  beforeEach(async () => {
    workspaceTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
    workspaceTree = await schematicRunner.runSchematic('library', libaryOptions, workspaceTree);
  });

  it('should create correct files', async () => {
    const tree = await schematicRunner.runSchematic(
      'library-entrypoint',
      { ...defaultOptions },
      workspaceTree,
    );
    const files = tree.files;

    expect(files).toEqual(
      jasmine.arrayContaining([
        '/projects/foo/src/lib/foo-secondary/README.md',
        '/projects/foo/src/lib/foo-secondary/ng-package.json',
      ]),
    );
  });

  it('should set correct main and secondary entrypoints in the README', async () => {
    const tree = await schematicRunner.runSchematic(
      'library-entrypoint',
      { ...defaultOptions },
      workspaceTree,
    );
    const content = tree.readContent('/projects/foo/src/lib/foo-secondary/README.md');
    expect(content).toMatch('# foo/foo-secondary');
  });

  it('should handle scope packages', async () => {
    workspaceTree = await schematicRunner.runSchematic(
      'library',
      { ...libaryOptions, name: '@scope/package' },
      workspaceTree,
    );
    const tree = await schematicRunner.runSchematic(
      'library-entrypoint',
      { ...defaultOptions, name: 'testing', project: '@scope/package' },
      workspaceTree,
    );
    const files = tree.files;
    expect(files).toEqual(
      jasmine.arrayContaining([
        '/projects/scope/package/src/lib/testing/README.md',
        '/projects/scope/package/src/lib/testing/ng-package.json',
      ]),
    );
  });

  it(`should add paths mapping to the tsconfig`, async () => {
    workspaceTree = await schematicRunner.runSchematic(
      'library',
      { ...libaryOptions, name: '@scope/package' },
      workspaceTree,
    );
    const tree = await schematicRunner.runSchematic(
      'library-entrypoint',
      { ...defaultOptions, name: 'testing', project: '@scope/package' },
      workspaceTree,
    );

    const tsConfigJson = getJsonFileContent(tree, 'tsconfig.json');
    expect(tsConfigJson.compilerOptions.paths['@scope/package/testing']).toEqual([
      './dist/scope/package/testing',
    ]);
  });

  it(`should append to existing paths mappings`, async () => {
    workspaceTree = await schematicRunner.runSchematic(
      'library',
      { ...libaryOptions, name: '@scope/package' },
      workspaceTree,
    );
    workspaceTree.overwrite(
      'tsconfig.json',
      JSON.stringify({
        compilerOptions: {
          paths: {
            'unrelated': ['./something/else.ts'],
            '@scope/package/testing': ['libs/*'],
          },
        },
      }),
    );
    const tree = await schematicRunner.runSchematic(
      'library-entrypoint',
      { ...defaultOptions, name: 'testing', project: '@scope/package' },
      workspaceTree,
    );

    const tsConfigJson = getJsonFileContent(tree, 'tsconfig.json');
    expect(tsConfigJson.compilerOptions.paths['@scope/package/testing']).toEqual([
      './dist/scope/package/testing',
    ]);
  });
});

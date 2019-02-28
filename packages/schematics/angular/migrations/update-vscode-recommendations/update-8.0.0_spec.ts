/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { readJsonInTree, serializeJson, updateJsonInTree } from './ast-utils';

describe('Update 8.0.0', () => {
  let initialTree: Tree;
  let schematicRunner: SchematicTestRunner;

  beforeEach(() => {
    initialTree = Tree.empty();

    initialTree.create(
      'package.json',
      serializeJson({
        devDependencies: { '@angular/cli': '7.1.0', typescript: '~3.1.0' },
      }),
    );

    schematicRunner = new SchematicTestRunner(
      'migrations',
      require.resolve('../migration-collection.json'),
    );
  });

  it('should add vscode extension recommendations', async () => {
    const result = await schematicRunner
      .runSchematicAsync('migration-07', {}, initialTree)
      .toPromise();

    expect(readJsonInTree(result, '.vscode/extensions.json')).toEqual({
      recommendations: ['angular.ng-template', 'ms-vscode.vscode-typescript-tslint-plugin'],
    });
  });

  it('should add to existing vscode extension recommendations', async () => {
    initialTree = await schematicRunner
      .callRule(
        updateJsonInTree('.vscode/extensions.json', () => ({
          recommendations: [
            'eamodio.gitlens', 'angular.ng-template', 'ms-vscode.vscode-typescript-tslint-plugin'],
        })),
        initialTree,
      )
      .toPromise();

    const result = await schematicRunner
      .runSchematicAsync('migration-07', {}, initialTree)
      .toPromise();

    expect(readJsonInTree(result, '.vscode/extensions.json')).toEqual({
      recommendations: [
        'eamodio.gitlens', 'angular.ng-template', 'ms-vscode.vscode-typescript-tslint-plugin'],
    });
  });
});

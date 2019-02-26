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

const recommendations = [
  'angular.ng-template',
  'nrwl.angular-console',
  'ms-vscode.vscode-typescript-tslint-plugin',
  'Mikael.Angular-BeastCode',
  'EditorConfig.EditorConfig',
  'msjsdiag.debugger-for-chrome',
  'eg2.vscode-npm-script',
  'PKief.material-icon-theme',
  'natewallace.angular2-inline',
];

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

    expect(readJsonInTree(result, '.vscode/extensions.json')).toEqual({recommendations});
  });

  it('should add to existing vscode extension recommendations', async () => {
    initialTree = await schematicRunner
      .callRule(
        updateJsonInTree('.vscode/extensions.json', () => ({
          recommendations: [
            'eamodio.gitlens',
            ...recommendations],
        })),
        initialTree,
      )
      .toPromise();

    const result = await schematicRunner
      .runSchematicAsync('migration-07', {}, initialTree)
      .toPromise();

    expect(readJsonInTree(result, '.vscode/extensions.json')).toEqual({
      recommendations: [
        'eamodio.gitlens',
        ...recommendations],
    });
  });
});

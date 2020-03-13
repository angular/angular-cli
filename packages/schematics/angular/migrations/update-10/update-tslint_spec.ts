/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { TSLINT_VERSION } from './update-tslint';

describe('Migration of tslint to version 6', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  const TSLINT_PATH = '/tslint.json';
  const PACKAGE_JSON_PATH = '/package.json';

  const TSLINT_CONFIG = {
    extends: 'tslint:recommended',
    rules: {
      'no-use-before-declare': true,
      'arrow-return-shorthand': false,
      'label-position': true,
    },
  };

  const PACKAGE_JSON = {
    devDependencies: {
      tslint: '~5.1.0',
    },
  };

  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    tree.create(PACKAGE_JSON_PATH, JSON.stringify(PACKAGE_JSON, null, 2));
    tree.create(TSLINT_PATH, JSON.stringify(TSLINT_CONFIG, null, 2));
  });

  it('should update tslint dependency', async () => {
    const newTree = await schematicRunner.runSchematicAsync('tslint-version-6', {}, tree).toPromise();
    const packageJson = JSON.parse(newTree.readContent(PACKAGE_JSON_PATH));
    expect(packageJson.devDependencies.tslint).toBe(TSLINT_VERSION);
  });

  it('should remove old/deprecated rules', async () => {
    const newTree = await schematicRunner.runSchematicAsync('tslint-version-6', {}, tree).toPromise();
    const { rules } = JSON.parse(newTree.readContent(TSLINT_PATH));
    expect(rules['no-use-before-declare']).toBeUndefined();
  });

  it('should add new rules', async () => {
    const newTree = await schematicRunner.runSchematicAsync('tslint-version-6', {}, tree).toPromise();
    const { rules } = JSON.parse(newTree.readContent(TSLINT_PATH));
    expect(rules['eofline']).toBe(true);
  });

  it('should not update already present rules', async () => {
    const newTree = await schematicRunner.runSchematicAsync('tslint-version-6', {}, tree).toPromise();
    const { rules } = JSON.parse(newTree.readContent(TSLINT_PATH));
    expect(rules['arrow-return-shorthand']).toBe(false);
  });

  it(`should not add new rules when not extending 'tslint:recommended'`, async () => {
    tree.overwrite(
      TSLINT_PATH,
      JSON.stringify({
        ...TSLINT_CONFIG,
        extends: 'tslint-config-prettier',
      }, null, 2),
    );

    const newTree = await schematicRunner.runSchematicAsync('tslint-version-6', {}, tree).toPromise();
    const { rules } = JSON.parse(newTree.readContent(TSLINT_PATH));
    expect(rules['eofline']).toBeUndefined();
  });

  it(`should not add new rules when extending multiple configs`, async () => {
    tree.overwrite(
      TSLINT_PATH,
      JSON.stringify({
        ...TSLINT_CONFIG,
        extends: [
          'tslint:recommended',
          'tslint-config-prettier',
        ],
      }, null, 2),
    );

    const newTree = await schematicRunner.runSchematicAsync('tslint-version-6', {}, tree).toPromise();
    const { rules } = JSON.parse(newTree.readContent(TSLINT_PATH));
    expect(rules['eofline']).toBeUndefined();
  });

  it(`should remove old/deprecated rules when extending multiple configs`, async () => {
    tree.overwrite(
      TSLINT_PATH,
      JSON.stringify({
        ...TSLINT_CONFIG,
        extends: [
          'tslint:recommended',
          'tslint-config-prettier',
        ],
      }, null, 2),
    );

    const newTree = await schematicRunner.runSchematicAsync('tslint-version-6', {}, tree).toPromise();
    const { rules } = JSON.parse(newTree.readContent(TSLINT_PATH));
    expect(rules['no-use-before-declare']).toBeUndefined();
  });
});

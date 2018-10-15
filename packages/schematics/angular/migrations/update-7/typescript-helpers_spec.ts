/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

const oldTsConfig = `
{
  "compileOnSave": false,
  "compilerOptions": {
    "baseUrl": "./",
    "outDir": "./dist/out-tsc",
    "sourceMap": true,
    "declaration": false,
    "module": "es2015",
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "importHelpers": false,
    "target": "es5",
    "typeRoots": [
      "node_modules/@types"
    ],
    "lib": [
      "es2018",
      "dom"
    ]
  }
}
`;

describe('typeScriptHelpersRule', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;

  beforeEach(async () => {
    tree = new UnitTestTree(new EmptyTree());
    tree = await schematicRunner.runExternalSchematicAsync(
      require.resolve('../../collection.json'), 'ng-new',
      {
        name: 'migration-test',
        version: '1.2.3',
        directory: '.',
      },
      tree,
    ).toPromise();
  });

  it('should work as expected', async () => {
    const tsConfigPath = '/tsconfig.json';
    tree.overwrite(tsConfigPath, oldTsConfig);
    const tree2 = await schematicRunner.runSchematicAsync('migration-04', {}, tree.branch())
      .toPromise();

    const { importHelpers } = JSON.parse(tree2.readContent(tsConfigPath)).compilerOptions;
    expect(importHelpers).toBe(true);

    const content = tree2.readContent('/package.json');
    const pkg = JSON.parse(content);
    expect(pkg.dependencies.tslib).toBeDefined();
  });
});

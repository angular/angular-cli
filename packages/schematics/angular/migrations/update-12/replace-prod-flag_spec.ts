/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe(`Migration to replace '--prod' flag from package.json scripts`, () => {
  const pkgJsonPath = '/package.json';
  const schematicName = 'replace-deprecated-prod-flag';

  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;

  beforeEach(async () => {
    tree = new UnitTestTree(new EmptyTree());
  });

  it(`should replace '--prod' with '--configuration production'`, async () => {
    tree.create(
      pkgJsonPath,
      JSON.stringify(
        {
          scripts: {
            build: 'ng build --prod',
            test: 'ng test --prod && ng e2e --prod',
          },
        },
        undefined,
        2,
      ),
    );
    const tree2 = await schematicRunner
      .runSchematicAsync(schematicName, {}, tree.branch())
      .toPromise();

    const { scripts } = JSON.parse(tree2.readContent(pkgJsonPath));
    expect(scripts).toEqual({
      build: 'ng build --configuration production',
      test: 'ng test --configuration production && ng e2e --configuration production',
    });
  });

  it(`should not replace flags that start with '--prod...'`, async () => {
    tree.create(
      pkgJsonPath,
      JSON.stringify(
        {
          scripts: {
            test: 'npx test --production && ng e2e --prod',
          },
        },
        undefined,
        2,
      ),
    );
    const tree2 = await schematicRunner
      .runSchematicAsync(schematicName, {}, tree.branch())
      .toPromise();

    const { scripts } = JSON.parse(tree2.readContent(pkgJsonPath));
    expect(scripts).toEqual({
      test: 'npx test --production && ng e2e --configuration production',
    });
  });
});

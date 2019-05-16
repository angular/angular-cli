/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { latestVersions } from '../../utility/latest-versions';

const oldPkg = `
{
  "devDependencies": {
    "@angular-devkit/build-angular": "0.0.0",
    "@angular-devkit/build-ng-packagr": "0.0.0"
  }
}
`;

describe('updateDevkitBuildNgPackagr', () => {
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
    tree.overwrite('/package.json', oldPkg);
    const tree2 = await schematicRunner.runSchematicAsync('migration-06', {}, tree.branch())
      .toPromise();

    const content = tree2.readContent('/package.json');
    const pkg = JSON.parse(content);
    expect(pkg.devDependencies['@angular-devkit/build-ng-packagr'])
      .toBe(latestVersions.DevkitBuildNgPackagr);
  });
});

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';

describe('Migration to delete platform-server exports', () => {
  const schematicName = 'remove-platform-server-exports';

  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: EmptyTree;

  beforeEach(() => {
    tree = new EmptyTree();
  });

  const testTypeScriptFilePath = './test.ts';

  describe(`Migration to remove '@angular/platform-server' exports`, () => {
    it(`should delete '@angular/platform-server' export when 'renderModule' is the only exported symbol`, async () => {
      tree.create(
        testTypeScriptFilePath,
        `
          import { Path, join } from '@angular-devkit/core';
          export { renderModule } from '@angular/platform-server';
        `,
      );

      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      const content = newTree.readText(testTypeScriptFilePath);
      expect(content).not.toContain('@angular/platform-server');
      expect(content).toContain(`import { Path, join } from '@angular-devkit/core';`);
    });

    it(`should delete only 'renderModule' when there are additional exports`, async () => {
      tree.create(
        testTypeScriptFilePath,
        `
          import { Path, join } from '@angular-devkit/core';
          export { renderModule, ServerModule } from '@angular/platform-server';
        `,
      );

      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      const content = newTree.readContent(testTypeScriptFilePath);
      expect(content).toContain(`import { Path, join } from '@angular-devkit/core';`);
      expect(content).toContain(`export { ServerModule } from '@angular/platform-server';`);
    });

    it(`should not delete 'renderModule' when it's exported from another module`, async () => {
      tree.create(
        testTypeScriptFilePath,
        `
          export { renderModule } from '@angular/core';
        `,
      );

      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      const content = newTree.readText(testTypeScriptFilePath);
      expect(content).toContain(`export { renderModule } from '@angular/core';`);
    });

    it(`should not delete 'renderModule' when it's imported from '@angular/platform-server'`, async () => {
      tree.create(
        testTypeScriptFilePath,
        `
          import { renderModule } from '@angular/platform-server';
        `,
      );

      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      const content = newTree.readText(testTypeScriptFilePath);
      expect(content).toContain(`import { renderModule } from '@angular/platform-server'`);
    });
  });
});

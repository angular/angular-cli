/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

const mainServerContent = tags.stripIndents`
  import { enableProdMode } from '@angular/core';

  import { environment } from './environments/environment';

  if (environment.production) {
    enableProdMode();
  }

  export { AppServerModule } from './app/app.server.module';
`;

const mainServerFile = 'src/main.server.ts';

describe('Migration to version 9', () => {
  describe('Migrate Server Main File', () => {
    const schematicRunner = new SchematicTestRunner(
      'migrations',
      require.resolve('../migration-collection.json'),
    );

    let tree: UnitTestTree;

    beforeEach(async () => {
      tree = new UnitTestTree(new EmptyTree());
      tree = await schematicRunner
        .runExternalSchematicAsync(
          require.resolve('../../collection.json'),
          'ng-new',
          {
            name: 'migration-test',
            version: '1.2.3',
            directory: '.',
          },
          tree,
        )
        .toPromise();
      tree = await schematicRunner
        .runExternalSchematicAsync(
          require.resolve('../../collection.json'),
          'universal',
          {
            clientProject: 'migration-test',
          },
          tree,
        )
        .toPromise();
    });

    it(`should add exports from '@angular/platform-server'`, async () => {
      tree.overwrite(mainServerFile, mainServerContent);
      const tree2 = await schematicRunner.runSchematicAsync('migration-09', {}, tree.branch()).toPromise();
      expect(tree2.readContent(mainServerFile)).toContain(tags.stripIndents`
        export { AppServerModule } from './app/app.server.module';
        export { renderModule, renderModuleFactory } from '@angular/platform-server';
      `);
    });

    it(`should add 'renderModule' and 'renderModuleFactory' to existing '@angular/platform-server' export`, async () => {
      tree.overwrite(mainServerFile, tags.stripIndents`
        ${mainServerContent}
        export { platformDynamicServer } from '@angular/platform-server';
        export { PlatformConfig } from '@angular/platform-server';
      `);
      const tree2 = await schematicRunner.runSchematicAsync('migration-09', {}, tree.branch()).toPromise();
      expect(tree2.readContent(mainServerFile)).toContain(tags.stripIndents`
        export { AppServerModule } from './app/app.server.module';
        export { platformDynamicServer, renderModule, renderModuleFactory } from '@angular/platform-server';
        export { PlatformConfig } from '@angular/platform-server';
      `);
    });

    it(`should add 'renderModule' to existing '@angular/platform-server' export`, async () => {
      tree.overwrite(mainServerFile, tags.stripIndents`
        ${mainServerContent}
        export { platformDynamicServer, renderModuleFactory } from '@angular/platform-server';
      `);
      const tree2 = await schematicRunner.runSchematicAsync('migration-09', {}, tree.branch()).toPromise();
      expect(tree2.readContent(mainServerFile)).toContain(tags.stripIndents`
        export { AppServerModule } from './app/app.server.module';
        export { platformDynamicServer, renderModuleFactory, renderModule } from '@angular/platform-server';
      `);
    });

    it(`should not update exports when 'renderModule' and 'renderModuleFactory' are already exported`, async () => {
      const input = tags.stripIndents`
        ${mainServerContent}
        export { renderModule, renderModuleFactory } from '@angular/platform-server';
      `;

      tree.overwrite(mainServerFile, input);
      const tree2 = await schematicRunner.runSchematicAsync('migration-09', {}, tree.branch()).toPromise();
      expect(tree2.readContent(mainServerFile)).toBe(input);
    });
  });
});

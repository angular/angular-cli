/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe(`Migration to replace 'provideServerRouting' with 'provideServerRendering' from '@angular/ssr'`, () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  const schematicName = 'replace-provide-server-routing';
  let tree: UnitTestTree;

  beforeEach(async () => {
    tree = new UnitTestTree(new EmptyTree());
    tree.create(
      '/package.json',
      JSON.stringify({
        dependencies: {
          '@angular/ssr': '0.0.0',
        },
      }),
    );

    tree.create(
      'src/app/app.config.ts',
      `
      import { ApplicationConfig } from '@angular/core';
      import { provideServerRendering, provideServerRouting } from '@angular/ssr';
      import { serverRoutes } from './app.routes';

      const serverConfig: ApplicationConfig = {
        providers: [
          provideServerRendering(),
          provideServerRouting(serverRoutes)
        ]
      };
      `,
    );
  });

  it('should add "withRoutes" to the import statement', async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readContent('src/app/app.config.ts');

    expect(content).toContain(`import { provideServerRendering, withRoutes } from '@angular/ssr';`);
  });

  it('should remove "provideServerRouting" and update "provideServerRendering"', async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readContent('src/app/app.config.ts');

    expect(content).toContain(`providers: [provideServerRendering(withRoutes(serverRoutes))]`);
    expect(content).not.toContain(`provideServerRouting(serverRoutes)`);
  });

  it('should correctly handle provideServerRouting with extra arguments', async () => {
    tree.overwrite(
      'src/app/app.config.ts',
      `
      import { ApplicationConfig } from '@angular/core';
      import { provideServerRendering, provideServerRouting } from '@angular/ssr';
      import { serverRoutes } from './app.routes';

      const serverConfig: ApplicationConfig = {
        providers: [
          provideServerRendering(),
          provideServerRouting(serverRoutes, withAppShell(AppShellComponent))
        ]
      };
      `,
    );

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readContent('src/app/app.config.ts');

    expect(content).toContain(
      `providers: [provideServerRendering(withRoutes(serverRoutes), withAppShell(AppShellComponent))]`,
    );
    expect(content).not.toContain(`provideServerRouting(serverRoutes)`);
  });
});

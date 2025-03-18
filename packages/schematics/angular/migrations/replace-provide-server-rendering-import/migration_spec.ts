/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe(`Migration to use the 'provideServerRendering' from '@angular/ssr'`, () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  const schematicName = 'replace-provide-server-rendering-import';

  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    tree.create(
      '/package.json',
      JSON.stringify({
        dependencies: {
          '@angular/ssr': '0.0.0',
        },
      }),
    );
  });

  it('should replace provideServerRendering with @angular/ssr and keep other imports', async () => {
    tree.create(
      'test.ts',
      `import { provideServerRendering, otherFunction } from '@angular/platform-server';`,
    );
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readContent('test.ts');
    expect(content).toContain("import { provideServerRendering } from '@angular/ssr';");
    expect(content).toContain("import { otherFunction } from '@angular/platform-server';");
  });

  it('should not replace provideServerRendering that is imported from @angular/ssr', async () => {
    tree.create(
      'test.ts',
      `
        import { otherFunction } from '@angular/platform-server';
        import { provideServerRendering, provideServerRouting } from '@angular/ssr';
      `,
    );
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readContent('test.ts');
    expect(content).toContain(
      "import { provideServerRendering, provideServerRouting } from '@angular/ssr';",
    );
    expect(content).toContain("import { otherFunction } from '@angular/platform-server';");
  });

  it('should merge with existing @angular/ssr imports', async () => {
    tree.create(
      'test.ts',
      `
          import { provideServerRouting } from '@angular/ssr';
          import { provideServerRendering } from '@angular/platform-server';
        `,
    );
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readContent('test.ts');
    expect(content).toContain(
      "import { provideServerRendering, provideServerRouting } from '@angular/ssr';",
    );
    expect(content.match(/@angular\/ssr/g) || []).toHaveSize(1);
  });
});

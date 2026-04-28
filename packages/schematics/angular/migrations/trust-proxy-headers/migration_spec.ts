/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

function createWorkSpaceConfig(tree: UnitTestTree) {
  const angularConfig = {
    version: 1,
    projects: {
      app: {
        root: '',
        sourceRoot: 'src',
        projectType: 'application',
        architect: {
          build: {
            options: {
              server: '/server.ts',
            },
          },
        },
      },
    },
  };

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
}

describe(`Migration to add trustProxyHeaders to server.ts`, () => {
  const schematicName = 'trust-proxy-headers';
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );
  const TODO_COMMENT =
    '// TODO: This is a security-sensitive option. Remove if not needed. ' +
    'For more information, see https://angular.dev/best-practices/security#configuring-trusted-proxy-headers';

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createWorkSpaceConfig(tree);
  });

  it(`should add trustProxyHeaders to AngularNodeAppEngine with no args`, async () => {
    tree.create(
      '/server.ts',
      `import { AngularNodeAppEngine } from '@angular/ssr/node';\nconst angularApp = new AngularNodeAppEngine();`,
    );

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readText('/server.ts');
    expect(content).toContain(`const angularApp = new AngularNodeAppEngine({`);
    expect(content).toContain(TODO_COMMENT);
    expect(content).toContain(`trustProxyHeaders: ['x-forwarded-host', 'x-forwarded-proto'],`);
  });

  it(`should add trustProxyHeaders to AngularNodeAppEngine with existing args`, async () => {
    tree.create(
      '/server.ts',
      `import { AngularNodeAppEngine } from '@angular/ssr/node';\n` +
        `const angularApp = new AngularNodeAppEngine({\n  allowedHosts: ['localhost']\n});`,
    );

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readText('/server.ts');
    expect(content).toContain(`const angularApp = new AngularNodeAppEngine({`);
    expect(content).toContain(TODO_COMMENT);
    expect(content).toContain(`trustProxyHeaders: ['x-forwarded-host', 'x-forwarded-proto'],`);
    expect(content).toContain(`allowedHosts: ['localhost']`);
  });

  it(`should add trustProxyHeaders to AngularAppEngine`, async () => {
    tree.create(
      '/server.ts',
      `import { AngularAppEngine } from '@angular/ssr';\nconst angularApp = new AngularAppEngine();`,
    );

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readText('/server.ts');
    expect(content).toContain(`const angularApp = new AngularAppEngine({`);
    expect(content).toContain(TODO_COMMENT);
    expect(content).toContain(`trustProxyHeaders: ['x-forwarded-host', 'x-forwarded-proto'],`);
  });

  it(`should not add trustProxyHeaders if it already exists`, async () => {
    const originalContent =
      `import { AngularAppEngine } from '@angular/ssr';\n` +
      `const angularApp = new AngularAppEngine({\n  trustProxyHeaders: true\n});`;
    tree.create('/server.ts', originalContent);

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const content = newTree.readText('/server.ts');
    expect(content).toBe(originalContent);
  });
});

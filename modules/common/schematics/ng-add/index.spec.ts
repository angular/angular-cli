/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

import { Schema as NgAddOptions } from './schema';

describe('ng-add schematic (clover)', () => {
  const defaultOptions: NgAddOptions = {
    clientProject: 'foo',
    prerender: false,
    ssr: false,
    skipInstall: true,
  };

  const ngNewOptions: any = {
    name: 'foo',
    directory: '/',
    skipInstall: true,
    version: '6.0.0',
    createApplication: true,
  };

  const schematicRunner = new SchematicTestRunner(
    '@nguniversal/common',
    require.resolve('../collection.json'),
  );

  let appTree: UnitTestTree;

  beforeEach(async () => {
    appTree = await schematicRunner
      .runExternalSchematicAsync('@schematics/angular', 'ng-new', ngNewOptions)
      .toPromise();
  });

  describe('when "ssr" is set to "true"', async () => {
    let tree: UnitTestTree;
    beforeEach(async () => {
      tree = await schematicRunner
        .runSchematicAsync(
          'ng-add',
          {
            ...defaultOptions,
            ssr: true,
          },
          appTree,
        )
        .toPromise();
    });

    it('should add "server.ts" and "tsconfig.server.json"', () => {
      expect(tree.files).toEqual(
        jasmine.arrayContaining(['/src/server.ts', '/tsconfig.server.json']),
      );
    });

    it('should add "server" builder in "angular.json"', () => {
      const workspace = JSON.parse(tree.readContent('/angular.json')) as any;
      expect(workspace.projects.foo.architect.server).toBeDefined();
    });

    it('should not add "prerender" builder in "angular.json"', () => {
      const workspace = JSON.parse(tree.readContent('/angular.json')) as any;
      expect(workspace.projects.foo.architect.prerender).toBeUndefined();
    });

    it('should not add dependency: @nguniversal/builders', async () => {
      const { devDependencies } = JSON.parse(tree.readContent('/package.json')) as any;
      expect(devDependencies['@nguniversal/builders']).toBeUndefined();
    });

    it('should update "app.module.ts"', async () => {
      const appModule = tree.readContent('/src/app/app.module.ts');
      expect(tags.stripIndents`${appModule}`).toContain(tags.stripIndents`
        imports: [
          BrowserModule.withServerTransition({ appId: 'appId' }),
          RendererModule.forRoot(),
          TransferHttpCacheModule
        ],
      `);
      expect(appModule).toContain(
        `import { RendererModule, TransferHttpCacheModule } from '@nguniversal/common/clover'`,
      );
    });
  });

  describe('when "prerender" is set to "true"', async () => {
    let tree: UnitTestTree;
    beforeEach(async () => {
      tree = await schematicRunner
        .runSchematicAsync(
          'ng-add',
          {
            ...defaultOptions,
            prerender: true,
          },
          appTree,
        )
        .toPromise();
    });

    it('should not add "server.ts" and "tsconfig.server.json"', () => {
      expect(tree.files).not.toEqual(
        jasmine.arrayContaining(['/src/server.ts', '/tsconfig.server.json']),
      );
    });

    it('should not add "server" builder in "angular.json"', () => {
      const workspace = JSON.parse(tree.readContent('/angular.json')) as any;
      expect(workspace.projects.foo.architect.server).toBeUndefined();
    });

    it('should add "prerender" builder in "angular.json"', () => {
      const workspace = JSON.parse(tree.readContent('/angular.json')) as any;
      expect(workspace.projects.foo.architect.prerender).toBeDefined();
    });

    it('should add dependency: @nguniversal/builders', async () => {
      const { devDependencies } = JSON.parse(tree.readContent('/package.json')) as any;
      expect(devDependencies['@nguniversal/builders']).toBeDefined();
    });

    it('should update "app.module.ts"', async () => {
      const appModule = tree.readContent('/src/app/app.module.ts');
      expect(tags.stripIndents`${appModule}`).toContain(tags.stripIndents`
        imports: [
          BrowserModule.withServerTransition({ appId: 'appId' }),
          RendererModule.forRoot(),
          TransferHttpCacheModule
        ],
      `);
      expect(appModule).toContain(
        `import { RendererModule, TransferHttpCacheModule } from '@nguniversal/common/clover'`,
      );
    });
  });
});

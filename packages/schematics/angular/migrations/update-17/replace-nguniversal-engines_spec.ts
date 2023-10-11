/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Builders, ProjectType, WorkspaceSchema } from '../../utility/workspace-models';

function createWorkSpaceConfig(tree: UnitTestTree) {
  const angularConfig: WorkspaceSchema = {
    version: 1,
    projects: {
      app: {
        root: '',
        sourceRoot: '/src',
        projectType: ProjectType.Application,
        prefix: 'app',
        architect: {
          build: {
            builder: Builders.Browser,
            options: {
              tsConfig: 'tsconfig.json',
              main: 'main.ts',
              polyfills: '',
              outputPath: 'dist/browser',
            },
          },
          server: {
            builder: Builders.Server,
            options: {
              tsConfig: 'tsconfig.json',
              main: 'server.ts',
              outputPath: 'dist/server',
            },
            configurations: {
              production: {
                main: 'server.ts',
              },
            },
          },
        },
      },
    },
  };

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
}

describe(`Migration to replace usages of '@nguniversal/' packages with '@angular/ssr'.`, () => {
  const schematicName = 'replace-nguniversal-engines';
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());

    createWorkSpaceConfig(tree);
    tree.create(
      '/package.json',
      JSON.stringify(
        {
          dependencies: {
            '@nguniversal/common': '0.0.0',
            '@nguniversal/express-engine': '0.0.0',
          },
        },
        undefined,
        2,
      ),
    );

    tree.create(
      'server.ts',
      `
  import 'zone.js/node';

import { APP_BASE_HREF } from '@angular/common';
import { ngExpressEngine } from '@nguniversal/express-engine';
import * as express from 'express';
import { existsSync } from 'fs';
import { join } from 'path';

import { AppServerModule } from './src/main.server';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const distFolder = join(process.cwd(), 'dist/browser');
  const indexHtml = existsSync(join(distFolder, 'index.original.html'))
    ? 'index.original.html'
    : 'index';

  // Our Universal express-engine (found @ https://github.com/angular/universal/tree/main/modules/express-engine)
  server.engine(
    'html',
    ngExpressEngine({
      bootstrap: AppServerModule,
      inlineCriticalCss: true,
    }),
  );

  server.set('view engine', 'html');
  server.set('views', distFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get(
    '*.*',
    express.static(distFolder, {
      maxAge: '1y',
    }),
  );

  // All regular routes use the Universal engine
  server.get('*', (req, res) => {
    res.render(indexHtml, { req, providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }] });
  });

  return server;
}

function run() {
  const port = process.env.PORT || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port);
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = (mainModule && mainModule.filename) || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
} `,
    );
  });

  it(`should remove all '@nguniversal/' from dependencies`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const { dependencies } = JSON.parse(newTree.readContent('/package.json'));
    expect(dependencies['@nguniversal/common']).toBeUndefined();
    expect(dependencies['@nguniversal/express-engine']).toBeUndefined();
  });

  it(`should add '@angular/ssr' as a dependencies`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const { dependencies } = JSON.parse(newTree.readContent('/package.json'));
    expect(dependencies['@angular/ssr']).toBeDefined();
  });

  it(`should replace imports from '@nguniversal/common' to '@angular/ssr'`, async () => {
    tree.create(
      'file.ts',
      `
      import { CommonEngine } from '@nguniversal/common';
      import { Component } from '@angular/core';
    `,
    );

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    expect(newTree.readContent('/file.ts')).toContain(
      `import { CommonEngine } from '@angular/ssr';`,
    );
  });

  it(`should replace anf backup 'server.ts' file`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    expect(newTree.readContent('server.ts.bak')).toContain(
      `import { ngExpressEngine } from '@nguniversal/express-engine';`,
    );

    const newServerFile = newTree.readContent('server.ts');
    expect(newServerFile).toContain(`import { CommonEngine } from '@angular/ssr';`);
    expect(newServerFile).toContain(`const distFolder = join(process.cwd(), 'dist/browser');`);
  });
});

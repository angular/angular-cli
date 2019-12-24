/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { collectionPath, createTestApp } from '../../testing/test-app';
import { version9UpdateRule } from './index';

// tslint:disable: no-non-null-assertion
describe('Migration to version 9', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    collectionPath,
  );

  let tree: UnitTestTree;
  beforeEach(async () => {
    tree =  await createTestApp();
    tree = await schematicRunner
      .runExternalSchematicAsync(
        '@schematics/angular',
        'universal',
        {
          clientProject: 'test-app',
        },
        tree,
      )
      .toPromise();

    // create old stucture
    tree.create('/projects/test-app/server.ts', 'server content');
    tree.create('/projects/test-app/webpack.server.config.js', 'webpack config content');

    tree.overwrite('/projects/test-app/src/main.server.ts', `
    import { enableProdMode } from '@angular/core';

    import { environment } from './environments/environment';

    if (environment.production) {
      enableProdMode();
    }

    export { AppServerModule } from './app/app.server.module';
    export { renderModule, renderModuleFactory } from '@angular/platform-server';
    export { ngExpressEngine } from '@nguniversal/express-engine';
    export { provideModuleMap } from '@nguniversal/module-map-ngfactory-loader';
    `);

    tree.overwrite('/projects/test-app/src/app/app.server.module.ts', `
    import { NgModule } from '@angular/core';
    import { ServerModule } from '@angular/platform-server';

    import { AppModule } from './app.module';
    import { AppComponent } from './app.component';
    import { ModuleMapLoaderModule } from '@nguniversal/module-map-ngfactory-loader';

    @NgModule({
      imports: [
        AppModule,
        ServerModule,
        ModuleMapLoaderModule,
      ],
      bootstrap: [AppComponent],
    })
    export class AppServerModule {}
    `);

    const pkg = JSON.parse(tree.readContent('/package.json'));
    const scripts = pkg.scripts;
    scripts['compile:server'] = 'old compile:server';
    scripts['serve:ssr'] = 'old serve:ssr';
    scripts['build:client-and-server-bundles'] = 'old build:client-and-server-bundles';

    tree.overwrite('/package.json', JSON.stringify(pkg, null, 2));
  });

  it(`should backup old 'server.ts' and 'webpack.server.config.js'`, async () => {
    const newTree = await schematicRunner.callRule(version9UpdateRule(''), tree).toPromise();
    expect(newTree.exists('/projects/test-app/server.ts.bak')).toBeTruthy();
    expect(newTree.exists('/projects/test-app/webpack.server.config.js.bak')).toBeTruthy();
  });

  it(`should backup old 'package.json' scripts`, async () => {
    const newTree = await schematicRunner.callRule(version9UpdateRule(''), tree).toPromise();

    const { scripts } = JSON.parse(newTree.read('/package.json')!.toString());
    expect(scripts['build:client-and-server-bundles']).toBeUndefined();
    expect(scripts['compile:server']).toBeUndefined();
    expect(scripts['serve:ssr']).toBeUndefined();

    expect(scripts['build:client-and-server-bundles_bak']).toBeDefined();
    expect(scripts['compile:server_bak']).toBeDefined();
    expect(scripts['serve:ssr_bak']).toBeDefined();
  });

  it(`should not backup old 'package.json' scripts when target is missing`, async () => {
    const newTree = await schematicRunner.callRule(version9UpdateRule(''), tree).toPromise();

    const { scripts } = JSON.parse(newTree.read('/package.json')!.toString());
    expect(scripts['build:ssr']).toBeUndefined();
    expect(scripts['build:ssr_bak']).toBeUndefined();
  });

  it(`should remove '@nguniversal/module-map-ngfactory-loader' references`, async () => {
    const newTree = await schematicRunner.callRule(version9UpdateRule(''), tree).toPromise();

    const appServerModule =
      newTree.read('/projects/test-app/src/app/app.server.module.ts')!.toString();
    expect(appServerModule).not.toContain(`from '@nguniversal/module-map-ngfactory-loader';`);
    expect(appServerModule).not.toContain('ModuleMapLoaderModule');

    const mainServer = newTree.read('/projects/test-app/src/main.server.ts')!.toString();
    expect(mainServer).not.toContain(`from '@nguniversal/module-map-ngfactory-loader';`);
  });
});

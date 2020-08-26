/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as ModuleOptions } from './schema';

// tslint:disable-next-line: no-big-function
describe('Module Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: ModuleOptions = {
    name: 'foo',
    module: undefined,
    flat: false,
    project: 'bar',
  };

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  const appOptions: ApplicationOptions = {
    name: 'bar',
    inlineStyle: false,
    inlineTemplate: false,
    routing: true,
    skipTests: false,
    skipPackageJson: false,
  };
  let appTree: UnitTestTree;
  beforeEach(async () => {
    appTree = await schematicRunner.runSchematicAsync('workspace', workspaceOptions).toPromise();
    appTree = await schematicRunner.runSchematicAsync('application', appOptions, appTree)
      .toPromise();
  });

  it('should create a module', async () => {
    const options = { ...defaultOptions };

    const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo/foo.module.ts');
  });

  it('should import into another module', async () => {
    const options = { ...defaultOptions, module: 'app.module.ts' };

    const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();
    const content = tree.readContent('/projects/bar/src/app/app.module.ts');
    expect(content).toMatch(/import { FooModule } from '.\/foo\/foo.module'/);
    expect(content).toMatch(/imports: \[[^\]]*FooModule[^\]]*\]/m);
  });

  it('should import into another module when using flat', async () => {
    const options = { ...defaultOptions, flat: true, module: 'app.module.ts' };

    const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();
    const content = tree.readContent('/projects/bar/src/app/app.module.ts');
    expect(content).toMatch(/import { FooModule } from '.\/foo.module'/);
    expect(content).toMatch(/imports: \[[^\]]*FooModule[^\]]*\]/m);
  });

  it('should import into another module (deep)', async () => {
    let tree = appTree;

    tree = await schematicRunner.runSchematicAsync('module', {
      ...defaultOptions,
      path: 'projects/bar/src/app/sub1',
      name: 'test1',
    }, tree).toPromise();
    tree = await schematicRunner.runSchematicAsync('module', {
      ...defaultOptions,
      path: 'projects/bar/src/app/sub2',
      name: 'test2',
      module: '../sub1/test1',
    }, tree).toPromise();

    const content = tree.readContent('/projects/bar/src/app/sub1/test1/test1.module.ts');
    expect(content).toMatch(/import { Test2Module } from '..\/..\/sub2\/test2\/test2.module'/);
  });

  it('should create a routing module', async () => {
    const options = { ...defaultOptions, routing: true };

    const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo/foo.module.ts');
    expect(files).toContain('/projects/bar/src/app/foo/foo-routing.module.ts');
    const moduleContent = tree.readContent('/projects/bar/src/app/foo/foo.module.ts');
    expect(moduleContent).toMatch(/import { FooRoutingModule } from '.\/foo-routing.module'/);
    const routingModuleContent = tree.readContent('/projects/bar/src/app/foo/foo-routing.module.ts');
    expect(routingModuleContent).toMatch(/RouterModule.forChild\(routes\)/);
  });

  it('should dasherize a name', async () => {
    const options = { ...defaultOptions, name: 'TwoWord' };

    const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/two-word/two-word.module.ts');
  });

  it('should respect the sourceRoot value', async () => {
    const config = JSON.parse(appTree.readContent('/angular.json'));
    config.projects.bar.sourceRoot = 'projects/bar/custom';
    appTree.overwrite('/angular.json', JSON.stringify(config, null, 2));
    appTree = await schematicRunner.runSchematicAsync('module', defaultOptions, appTree)
      .toPromise();
    expect(appTree.files).toContain('/projects/bar/custom/app/foo/foo.module.ts');
  });

  describe('lazy route generator', () => {
    const options = {
      ...defaultOptions,
      route: '/new-route',
      module: 'app',
    };

    it('should generate a lazy loaded module with a routing module', async () => {
      const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();
      const files = tree.files;

      expect(files).toEqual(jasmine.arrayContaining([
        '/projects/bar/src/app/foo/foo.module.ts',
        '/projects/bar/src/app/foo/foo-routing.module.ts',
        '/projects/bar/src/app/foo/foo.component.ts',
        '/projects/bar/src/app/foo/foo.component.html',
        '/projects/bar/src/app/foo/foo.component.css',
      ]));

      const appRoutingModuleContent = tree.readContent('/projects/bar/src/app/app-routing.module.ts');
      expect(appRoutingModuleContent).toMatch(
        /path: '\/new-route', loadChildren: \(\) => import\('.\/foo\/foo.module'\).then\(m => m.FooModule\)/,
      );

      const fooRoutingModuleContent = tree.readContent('/projects/bar/src/app/foo/foo-routing.module.ts');
      expect(fooRoutingModuleContent).toMatch(/RouterModule.forChild\(routes\)/);
      expect(fooRoutingModuleContent)
        .toMatch(/const routes: Routes = \[\r?\n?\s*{ path: '', component: FooComponent }\r?\n?\s*\];/);
    });

    it('should generate a lazy loaded module with embedded route declarations', async () => {
      appTree.overwrite('/projects/bar/src/app/app.module.ts',
        `
        import { NgModule } from '@angular/core';
        import { AppComponent } from './app.component';

        @NgModule({
          declarations: [
            AppComponent
          ],
          imports: [
            BrowserModule,
            RouterModule.forRoot([])
          ],
          providers: [],
          bootstrap: [AppComponent]
        })
        export class AppModule { }
        `,
      );
      appTree.delete('/projects/bar/src/app/app-routing.module.ts');

      const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();
      const files = tree.files;

      expect(files).toContain('/projects/bar/src/app/foo/foo.module.ts');
      expect(files).not.toContain('/projects/bar/src/app/foo/foo-routing.module.ts');
      expect(files).toContain('/projects/bar/src/app/foo/foo.component.ts');
      expect(files).toContain('/projects/bar/src/app/foo/foo.component.html');
      expect(files).toContain('/projects/bar/src/app/foo/foo.component.css');

      const appModuleContent = tree.readContent('/projects/bar/src/app/app.module.ts');
      expect(appModuleContent).toMatch(
        /path: '\/new-route', loadChildren: \(\) => import\('.\/foo\/foo.module'\).then\(m => m.FooModule\)/,
      );

      const fooModuleContent = tree.readContent('/projects/bar/src/app/foo/foo.module.ts');
      expect(fooModuleContent).toMatch(/RouterModule.forChild\(routes\)/);
      expect(fooModuleContent)
        .toMatch(/const routes: Routes = \[\r?\n?\s*{ path: '', component: FooComponent }\r?\n?\s*\];/);
    });

    it('should generate a lazy loaded module when "flat" flag is true', async () => {
      const tree = await schematicRunner.runSchematicAsync(
        'module',
        { ...options, flat: true },
        appTree,
      ).toPromise();
      const files = tree.files;

      expect(files).toEqual(jasmine.arrayContaining([
        '/projects/bar/src/app/foo.module.ts',
        '/projects/bar/src/app/foo-routing.module.ts',
        '/projects/bar/src/app/foo.component.ts',
        '/projects/bar/src/app/foo.component.html',
        '/projects/bar/src/app/foo.component.css',
      ]));

      const appRoutingModuleContent = tree.readContent('/projects/bar/src/app/app-routing.module.ts');
      expect(appRoutingModuleContent).toMatch(
        /path: '\/new-route', loadChildren: \(\) => import\('.\/foo.module'\).then\(m => m.FooModule\)/,
      );
    });

    it('should generate a lazy loaded module and add route in another parallel routing module', async () => {
      await schematicRunner.runSchematicAsync(
        'module',
        {
          ...defaultOptions,
          name: 'foo',
          routing: true,
        },
        appTree,
      ).toPromise();

      const tree = await schematicRunner.runSchematicAsync(
        'module',
        {
          ...defaultOptions,
          name: 'bar',
          module: 'foo',
          route: 'new-route',
        },
        appTree,
      ).toPromise();

      expect(tree.files).toEqual(jasmine.arrayContaining([
        '/projects/bar/src/app/foo/foo-routing.module.ts',
        '/projects/bar/src/app/foo/foo.module.ts',
        '/projects/bar/src/app/bar/bar-routing.module.ts',
        '/projects/bar/src/app/bar/bar.module.ts',
        '/projects/bar/src/app/bar/bar.component.ts',
      ]));

      const barRoutingModuleContent = tree.readContent('/projects/bar/src/app/bar/bar-routing.module.ts');
      expect(barRoutingModuleContent).toContain(`path: '', component: BarComponent `);

      const fooRoutingModuleContent = tree.readContent('/projects/bar/src/app/foo/foo-routing.module.ts');
      expect(fooRoutingModuleContent).toContain(`loadChildren: () => import('../bar/bar.module').then(m => m.BarModule)`);
    });
  });
});

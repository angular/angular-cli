/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Style as AppStyle, Schema as ApplicationOptions } from '../application/schema';
import { createAppModule } from '../utility/test';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { ChangeDetection, Schema as ComponentOptions, Style } from './schema';

describe('Component Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: ComponentOptions = {
    name: 'foo',
    // path: 'src/app',
    inlineStyle: false,
    inlineTemplate: false,
    displayBlock: false,
    changeDetection: ChangeDetection.Default,
    style: Style.Css,
    type: 'Component',
    skipTests: false,
    module: undefined,
    export: false,
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
    routing: false,
    style: AppStyle.Css,
    skipTests: false,
    skipPackageJson: false,
  };

  let appTree: UnitTestTree;

  beforeEach(async () => {
    appTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = await schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should contain a TestBed compileComponents call', async () => {
    const options = { ...defaultOptions };

    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const tsContent = tree.readContent('/projects/bar/src/app/foo/foo.component.spec.ts');
    expect(tsContent).toContain('compileComponents()');
  });

  it('should set change detection to OnPush', async () => {
    const options = { ...defaultOptions, changeDetection: 'OnPush' };

    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const tsContent = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(tsContent).toMatch(/changeDetection: ChangeDetectionStrategy.OnPush/);
  });

  it('should not set view encapsulation', async () => {
    const options = { ...defaultOptions };

    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const tsContent = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(tsContent).not.toMatch(/encapsulation: ViewEncapsulation/);
  });

  it('should set view encapsulation to Emulated', async () => {
    const options = { ...defaultOptions, viewEncapsulation: 'Emulated' };

    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const tsContent = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(tsContent).toMatch(/encapsulation: ViewEncapsulation.Emulated/);
  });

  it('should set view encapsulation to None', async () => {
    const options = { ...defaultOptions, viewEncapsulation: 'None' };

    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const tsContent = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(tsContent).toMatch(/encapsulation: ViewEncapsulation.None/);
  });

  it('should create a flat component', async () => {
    const options = { ...defaultOptions, flat: true };

    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const files = tree.files;
    expect(files).toEqual(
      jasmine.arrayContaining([
        '/projects/bar/src/app/foo.component.css',
        '/projects/bar/src/app/foo.component.html',
        '/projects/bar/src/app/foo.component.spec.ts',
        '/projects/bar/src/app/foo.component.ts',
      ]),
    );
  });

  it('should handle upper case paths', async () => {
    const pathOption = 'projects/bar/src/app/SOME/UPPER/DIR';
    const options = { ...defaultOptions, path: pathOption };

    const tree = await schematicRunner.runSchematic('component', options, appTree);
    let files = tree.files;
    let root = `/${pathOption}/foo/foo.component`;
    expect(files).toEqual(
      jasmine.arrayContaining([`${root}.css`, `${root}.html`, `${root}.spec.ts`, `${root}.ts`]),
    );

    const options2 = { ...options, name: 'BAR' };
    const tree2 = await schematicRunner.runSchematic('component', options2, tree);
    files = tree2.files;
    root = `/${pathOption}/bar/bar.component`;
    expect(files).toEqual(
      jasmine.arrayContaining([`${root}.css`, `${root}.html`, `${root}.spec.ts`, `${root}.ts`]),
    );
  });

  it('should create a component in a sub-directory', async () => {
    const options = { ...defaultOptions, path: 'projects/bar/src/app/a/b/c' };

    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const files = tree.files;
    const root = `/${options.path}/foo/foo.component`;
    expect(files).toEqual(
      jasmine.arrayContaining([`${root}.css`, `${root}.html`, `${root}.spec.ts`, `${root}.ts`]),
    );
  });

  it('should use the prefix', async () => {
    const options = { ...defaultOptions, prefix: 'pre' };

    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(content).toMatch(/selector: 'pre-foo'/);
  });

  it('should error when name starts with a digit', async () => {
    const options = { ...defaultOptions, name: '1-one' };

    await expectAsync(
      schematicRunner.runSchematic('component', options, appTree),
    ).toBeRejectedWithError('Selector "app-1-one" is invalid.');
  });

  it('should allow dash in selector before a number', async () => {
    const options = { ...defaultOptions, name: 'one-1' };

    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/one-1/one-1.component.ts');
    expect(content).toMatch(/selector: 'app-one-1'/);
  });

  it('should allow dash in selector before a number and with a custom prefix', async () => {
    const options = { ...defaultOptions, name: 'one-1', prefix: 'pre' };

    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/one-1/one-1.component.ts');
    expect(content).toMatch(/selector: 'pre-one-1'/);
  });

  it('should allow dash in selector before a number and without a prefix', async () => {
    const options = { ...defaultOptions, name: 'one-2', selector: 'one-2' };

    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/one-2/one-2.component.ts');
    expect(content).toMatch(/selector: 'one-2'/);
  });

  it('should use the default project prefix if none is passed', async () => {
    const options = { ...defaultOptions, prefix: undefined };

    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(content).toMatch(/selector: 'app-foo'/);
  });

  it('should use the supplied prefix if it is ""', async () => {
    const options = { ...defaultOptions, prefix: '' };

    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(content).toMatch(/selector: 'foo'/);
  });

  it('should respect the inlineTemplate option', async () => {
    const options = { ...defaultOptions, inlineTemplate: true };
    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(content).toMatch(/template: /);
    expect(content).not.toMatch(/templateUrl: /);
    expect(tree.files).not.toContain('/projects/bar/src/app/foo/foo.component.html');
  });

  it('should respect the inlineStyle option', async () => {
    const options = { ...defaultOptions, inlineStyle: true };
    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(content).toMatch(/styles: `/);
    expect(content).not.toMatch(/styleUrl: /);
    expect(tree.files).not.toContain('/projects/bar/src/app/foo/foo.component.css');
  });

  it('should respect the displayBlock option when inlineStyle is `false`', async () => {
    const options = { ...defaultOptions, displayBlock: true };
    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.css');
    expect(content).toMatch(/:host {\r?\n {2}display: block;\r?\n}/);
  });

  it('should respect the displayBlock option when inlineStyle is `false` and use correct syntax for `scss`', async () => {
    const options = { ...defaultOptions, displayBlock: true, style: 'scss' };
    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.scss');
    expect(content).toMatch(/:host {\r?\n {2}display: block;\r?\n}/);
  });

  it('should respect the displayBlock option when inlineStyle is `false` and use correct syntax for `sass', async () => {
    const options = { ...defaultOptions, displayBlock: true, style: 'sass' };
    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.sass');
    expect(content).toMatch(/\\:host\r?\n {2}display: block;\r?\n/);
  });

  it('should respect the displayBlock option when inlineStyle is `true`', async () => {
    const options = { ...defaultOptions, displayBlock: true, inlineStyle: true };
    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(content).toMatch(/:host {\r?\n(\s*)display: block;(\s*)}\r?\n/);
  });

  it('should respect the style option', async () => {
    const options = { ...defaultOptions, style: Style.Sass };
    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(content).toMatch(/styleUrl: '.\/foo.component.sass/);
    expect(tree.files).toContain('/projects/bar/src/app/foo/foo.component.sass');
    expect(tree.files).not.toContain('/projects/bar/src/app/foo/foo.component.css');
  });

  it('should respect the style=none option', async () => {
    const options = { ...defaultOptions, style: Style.None };
    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(content).not.toMatch(/styleUrls: /);
    expect(tree.files).not.toContain('/projects/bar/src/app/foo/foo.component.css');
    expect(tree.files).not.toContain('/projects/bar/src/app/foo/foo.component.none');
  });

  it('should respect the type option', async () => {
    const options = { ...defaultOptions, type: 'Route' };
    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.route.ts');
    const testContent = tree.readContent('/projects/bar/src/app/foo/foo.route.spec.ts');
    expect(content).toContain('export class FooRoute');
    expect(testContent).toContain("describe('FooRoute'");
    expect(tree.files).toContain('/projects/bar/src/app/foo/foo.route.css');
    expect(tree.files).toContain('/projects/bar/src/app/foo/foo.route.html');
  });

  it('should allow empty string in the type option', async () => {
    const options = { ...defaultOptions, type: '' };
    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.ts');
    const testContent = tree.readContent('/projects/bar/src/app/foo/foo.spec.ts');
    expect(content).toContain('export class Foo');
    expect(testContent).toContain("describe('Foo'");
    expect(tree.files).toContain('/projects/bar/src/app/foo/foo.css');
    expect(tree.files).toContain('/projects/bar/src/app/foo/foo.html');
  });

  it('should create the right selector with a path in the name', async () => {
    const options = { ...defaultOptions, name: 'sub/test' };
    appTree = await schematicRunner.runSchematic('component', options, appTree);
    const content = appTree.readContent('/projects/bar/src/app/sub/test/test.component.ts');
    expect(content).toMatch(/selector: 'app-test'/);
  });

  it('should respect the skipSelector option', async () => {
    const options = { ...defaultOptions, name: 'sub/test', skipSelector: true };
    appTree = await schematicRunner.runSchematic('component', options, appTree);
    const content = appTree.readContent('/projects/bar/src/app/sub/test/test.component.ts');
    expect(content).not.toMatch(/selector: 'app-test'/);
  });

  it('should respect the skipTests option', async () => {
    const options = { ...defaultOptions, skipTests: true };
    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const files = tree.files;

    expect(files).toEqual(
      jasmine.arrayContaining([
        '/projects/bar/src/app/foo/foo.component.css',
        '/projects/bar/src/app/foo/foo.component.html',
        '/projects/bar/src/app/foo/foo.component.ts',
      ]),
    );
    expect(tree.files).not.toContain('/projects/bar/src/app/foo/foo.component.spec.ts');
  });

  it('should respect templateUrl when style=none and changeDetection=OnPush', async () => {
    const options = { ...defaultOptions, style: Style.None, changeDetection: 'OnPush' };
    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(content).not.toMatch(/styleUrls: /);
    expect(content).toMatch(/templateUrl: '.\/foo.component.html',\n/);
    expect(content).toMatch(/changeDetection: ChangeDetectionStrategy.OnPush/);
  });

  it('should respect inlineTemplate when style=none and changeDetection=OnPush', async () => {
    const options = {
      ...defaultOptions,
      style: Style.None,
      changeDetection: 'OnPush',
      inlineTemplate: true,
    };
    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(content).not.toMatch(/styleUrls: /);
    expect(content).toMatch(/template: `(\n(.|)*){3}\n\s*`,\n/);
    expect(content).toMatch(/changeDetection: ChangeDetectionStrategy.OnPush/);
  });

  it('should create a standalone component', async () => {
    const options = { ...defaultOptions, standalone: true };
    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const moduleContent = tree.readContent('/projects/bar/src/app/app.module.ts');
    const componentContent = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
    expect(componentContent).toContain('class FooComponent');
    expect(moduleContent).not.toContain('FooComponent');
    expect(componentContent).toContain('standalone: true');
  });

  it('should declare standalone components in the `imports` of a test', async () => {
    const options = { ...defaultOptions, standalone: true };
    const tree = await schematicRunner.runSchematic('component', options, appTree);
    const testContent = tree.readContent('/projects/bar/src/app/foo/foo.component.spec.ts');
    expect(testContent).toContain('imports: [FooComponent]');
    expect(testContent).not.toContain('declarations');
  });

  describe('standalone=false', () => {
    const defaultNonStandaloneOptions: ComponentOptions = {
      ...defaultOptions,
      standalone: false,
      project: 'baz',
    };

    beforeEach(async () => {
      appTree = await schematicRunner.runSchematic(
        'application',
        { ...appOptions, standalone: false, name: 'baz' },
        appTree,
      );
    });

    it('should create a component', async () => {
      const options = { ...defaultNonStandaloneOptions };
      const tree = await schematicRunner.runSchematic('component', options, appTree);
      const files = tree.files;
      expect(files).toEqual(
        jasmine.arrayContaining([
          '/projects/baz/src/app/foo/foo.component.css',
          '/projects/baz/src/app/foo/foo.component.html',
          '/projects/baz/src/app/foo/foo.component.spec.ts',
          '/projects/baz/src/app/foo/foo.component.ts',
        ]),
      );
      const moduleContent = tree.readContent('/projects/baz/src/app/app.module.ts');
      expect(moduleContent).toMatch(/import.*Foo.*from '.\/foo\/foo.component'/);
      expect(moduleContent).toMatch(/declarations:\s*\[[^\]]+?,\r?\n\s+FooComponent\r?\n/m);
    });

    it('should use the module flag even if the module is a routing module', async () => {
      const routingFileName = 'app-routing.module.ts';
      const routingModulePath = `/projects/baz/src/app/${routingFileName}`;
      const newTree = createAppModule(appTree, routingModulePath);
      const options = { ...defaultNonStandaloneOptions, module: routingFileName };
      const tree = await schematicRunner.runSchematic('component', options, newTree);
      const content = tree.readContent(routingModulePath);
      expect(content).toMatch(/import { FooComponent } from '.\/foo\/foo.component/);
    });

    it('should handle a path in the name option', async () => {
      const options = { ...defaultNonStandaloneOptions, name: 'dir/test-component' };

      const tree = await schematicRunner.runSchematic('component', options, appTree);
      const content = tree.readContent('/projects/baz/src/app/app.module.ts');
      expect(content).toMatch(
        /import { TestComponentComponent } from '\.\/dir\/test-component\/test-component.component'/,
      );
    });

    it('should handle a path in the name and module options', async () => {
      appTree = await schematicRunner.runSchematic(
        'module',
        { name: 'admin/module', project: 'baz' },
        appTree,
      );

      const options = {
        ...defaultNonStandaloneOptions,
        name: 'other/test-component',
        module: 'admin/module',
      };
      appTree = await schematicRunner.runSchematic('component', options, appTree);

      const content = appTree.readContent('/projects/baz/src/app/admin/module/module.module.ts');
      expect(content).toMatch(
        /import { TestComponentComponent } from '..\/..\/other\/test-component\/test-component.component'/,
      );
    });

    it('should find the closest module', async () => {
      const options = { ...defaultNonStandaloneOptions };
      const fooModule = '/projects/baz/src/app/foo/foo.module.ts';
      appTree.create(
        fooModule,
        `
      import { NgModule } from '@angular/core';

      @NgModule({
        imports: [],
        declarations: []
      })
      export class FooModule { }
    `,
      );

      const tree = await schematicRunner.runSchematic('component', options, appTree);
      const fooModuleContent = tree.readContent(fooModule);
      expect(fooModuleContent).toMatch(/import { FooComponent } from '.\/foo.component'/);
    });

    it('should export the component', async () => {
      const options = { ...defaultNonStandaloneOptions, export: true };

      const tree = await schematicRunner.runSchematic('component', options, appTree);
      const appModuleContent = tree.readContent('/projects/baz/src/app/app.module.ts');
      expect(appModuleContent).toMatch(/exports: \[\n(\s*) {2}FooComponent\n\1\]/);
    });

    it('should import into a specified module', async () => {
      const options = { ...defaultNonStandaloneOptions, module: 'app.module.ts' };

      const tree = await schematicRunner.runSchematic('component', options, appTree);
      const appModule = tree.readContent('/projects/baz/src/app/app.module.ts');

      expect(appModule).toMatch(/import { FooComponent } from '.\/foo\/foo.component'/);
    });

    it('should respect the sourceRoot value', async () => {
      const config = JSON.parse(appTree.readContent('/angular.json'));
      config.projects.baz.sourceRoot = 'projects/baz/custom';
      appTree.overwrite('/angular.json', JSON.stringify(config, null, 2));

      // should fail without a module in that dir
      await expectAsync(
        schematicRunner.runSchematic('component', defaultNonStandaloneOptions, appTree),
      ).toBeRejected();

      // move the module
      appTree.rename(
        '/projects/baz/src/app/app.module.ts',
        '/projects/baz/custom/app/app.module.ts',
      );
      appTree = await schematicRunner.runSchematic(
        'component',
        defaultNonStandaloneOptions,
        appTree,
      );

      expect(appTree.files).toContain('/projects/baz/custom/app/foo/foo.component.ts');
    });

    it('should fail if specified module does not exist', async () => {
      const options = {
        ...defaultNonStandaloneOptions,
        module: '/projects/baz/src/app.moduleXXX.ts',
      };

      await expectAsync(schematicRunner.runSchematic('component', options, appTree)).toBeRejected();
    });
  });
});

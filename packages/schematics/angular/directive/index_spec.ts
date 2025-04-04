/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as DirectiveOptions } from './schema';

describe('Directive Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: DirectiveOptions = {
    name: 'foo',
    module: undefined,
    export: false,
    prefix: 'app',
    flat: true,
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
    skipTests: false,
    skipPackageJson: false,
  };
  let appTree: UnitTestTree;
  beforeEach(async () => {
    appTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = await schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should create respect the flat flag', async () => {
    const options = { ...defaultOptions, flat: false };

    const tree = await schematicRunner.runSchematic('directive', options, appTree);
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo/foo.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo/foo.ts');
  });

  it('should converts dash-cased-name to a camelCasedSelector', async () => {
    const options = { ...defaultOptions, name: 'my-dir' };

    const tree = await schematicRunner.runSchematic('directive', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/my-dir.ts');
    expect(content).toMatch(/selector: '\[appMyDir\]'/);
  });

  it('should create the right selector with a path in the name', async () => {
    const options = { ...defaultOptions, name: 'sub/test' };
    appTree = await schematicRunner.runSchematic('directive', options, appTree);

    const content = appTree.readContent('/projects/bar/src/app/sub/test.ts');
    expect(content).toMatch(/selector: '\[appTest\]'/);
  });

  it('should use the prefix', async () => {
    const options = { ...defaultOptions, prefix: 'pre' };
    const tree = await schematicRunner.runSchematic('directive', options, appTree);

    const content = tree.readContent('/projects/bar/src/app/foo.ts');
    expect(content).toMatch(/selector: '\[preFoo\]'/);
  });

  it('should use the default project prefix if none is passed', async () => {
    const options = { ...defaultOptions, prefix: undefined };
    const tree = await schematicRunner.runSchematic('directive', options, appTree);

    const content = tree.readContent('/projects/bar/src/app/foo.ts');
    expect(content).toMatch(/selector: '\[appFoo\]'/);
  });

  it('should use the supplied prefix if it is ""', async () => {
    const options = { ...defaultOptions, prefix: '' };
    const tree = await schematicRunner.runSchematic('directive', options, appTree);

    const content = tree.readContent('/projects/bar/src/app/foo.ts');
    expect(content).toMatch(/selector: '\[foo\]'/);
  });

  it('should respect skipTests flag', async () => {
    const options = { ...defaultOptions, skipTests: true };

    const tree = await schematicRunner.runSchematic('directive', options, appTree);
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo.ts');
    expect(files).not.toContain('/projects/bar/src/app/foo.spec.ts');
  });

  it('should create a standalone directive', async () => {
    const options = { ...defaultOptions, standalone: true };
    const tree = await schematicRunner.runSchematic('directive', options, appTree);
    const directiveContent = tree.readContent('/projects/bar/src/app/foo.ts');
    expect(directiveContent).not.toContain('standalone');
    expect(directiveContent).toContain('class Foo');
  });

  it('should error when class name contains invalid characters', async () => {
    const options = { ...defaultOptions, name: '404' };

    await expectAsync(
      schematicRunner.runSchematic('component', options, appTree),
    ).toBeRejectedWithError('Class name "404" is invalid.');
  });

  it('should respect the type option', async () => {
    const options = { ...defaultOptions, type: 'Directive' };
    const tree = await schematicRunner.runSchematic('directive', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo.directive.ts');
    const testContent = tree.readContent('/projects/bar/src/app/foo.directive.spec.ts');
    expect(content).toContain('export class FooDirective');
    expect(testContent).toContain("describe('FooDirective'");
  });

  it('should allow empty string in the type option', async () => {
    const options = { ...defaultOptions, type: '' };
    const tree = await schematicRunner.runSchematic('directive', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo.ts');
    const testContent = tree.readContent('/projects/bar/src/app/foo.spec.ts');
    expect(content).toContain('export class Foo');
    expect(testContent).toContain("describe('Foo'");
  });

  describe('standalone=false', () => {
    const defaultNonStandaloneOptions: DirectiveOptions = {
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

    it('should create a directive', async () => {
      const options = { ...defaultNonStandaloneOptions };

      const tree = await schematicRunner.runSchematic('directive', options, appTree);
      const files = tree.files;
      expect(files).toContain('/projects/baz/src/app/foo.spec.ts');
      expect(files).toContain('/projects/baz/src/app/foo.ts');
      const moduleContent = tree.readContent('/projects/baz/src/app/app-module.ts');
      expect(moduleContent).toMatch(/import.*Foo.*from '.\/foo'/);
      expect(moduleContent).toMatch(/declarations:\s*\[[^\]]+?,\r?\n\s+Foo\r?\n/m);
    });

    it('should respect the sourceRoot value', async () => {
      const config = JSON.parse(appTree.readContent('/angular.json'));
      config.projects.baz.sourceRoot = 'projects/baz/custom';
      appTree.overwrite('/angular.json', JSON.stringify(config, null, 2));

      // should fail without a module in that dir
      await expectAsync(
        schematicRunner.runSchematic('directive', defaultNonStandaloneOptions, appTree),
      ).toBeRejected();

      // move the module
      appTree.rename(
        '/projects/baz/src/app/app-module.ts',
        '/projects/baz/custom/app/app-module.ts',
      );
      appTree = await schematicRunner.runSchematic(
        'directive',
        defaultNonStandaloneOptions,
        appTree,
      );

      expect(appTree.files).toContain('/projects/baz/custom/app/foo.ts');
    });

    it('should find the closest module', async () => {
      const options = { ...defaultNonStandaloneOptions, flat: false };
      const fooModule = '/projects/baz/src/app/foo/foo-module.ts';
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

      const tree = await schematicRunner.runSchematic('directive', options, appTree);
      const fooModuleContent = tree.readContent(fooModule);
      expect(fooModuleContent).toMatch(/import { Foo } from '.\/foo'/);
    });

    it('should export the directive', async () => {
      const options = { ...defaultNonStandaloneOptions, export: true };

      const tree = await schematicRunner.runSchematic('directive', options, appTree);
      const appModuleContent = tree.readContent('/projects/baz/src/app/app-module.ts');
      expect(appModuleContent).toMatch(/exports: \[\n(\s*) {2}Foo\n\1\]/);
    });

    it('should import into a specified module', async () => {
      const options = { ...defaultNonStandaloneOptions, module: 'app-module.ts' };

      const tree = await schematicRunner.runSchematic('directive', options, appTree);
      const appModule = tree.readContent('/projects/baz/src/app/app-module.ts');

      expect(appModule).toMatch(/import { Foo } from '.\/foo'/);
    });

    it('should fail if specified module does not exist', async () => {
      const options = {
        ...defaultNonStandaloneOptions,
        module: '/projects/baz/src/app/app.moduleXXX.ts',
      };

      await expectAsync(schematicRunner.runSchematic('directive', options, appTree)).toBeRejected();
    });
  });
});

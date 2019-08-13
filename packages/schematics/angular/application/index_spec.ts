/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { latestVersions } from '../utility/latest-versions';
import { getFileContent } from '../utility/test';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as ApplicationOptions, Style, ViewEncapsulation } from './schema';

describe('Application Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  const defaultOptions: ApplicationOptions = {
    name: 'foo',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    skipPackageJson: false,
  };

  let workspaceTree: UnitTestTree;
  beforeEach(async () => {
    workspaceTree = await schematicRunner.runSchematicAsync('workspace', workspaceOptions).toPromise();
  });

  it('should create all files of an application', async () => {
    const options = { ...defaultOptions };

    const tree = await schematicRunner.runSchematicAsync('application', options, workspaceTree)
      .toPromise();
    const files = tree.files;
    expect(files).toEqual(jasmine.arrayContaining([
      '/projects/foo/karma.conf.js',
      '/projects/foo/tsconfig.app.json',
      '/projects/foo/tsconfig.spec.json',
      '/projects/foo/tslint.json',
      '/projects/foo/src/environments/environment.ts',
      '/projects/foo/src/environments/environment.prod.ts',
      '/projects/foo/src/favicon.ico',
      '/projects/foo/src/index.html',
      '/projects/foo/src/main.ts',
      '/projects/foo/src/polyfills.ts',
      '/projects/foo/src/styles.css',
      '/projects/foo/src/test.ts',
      '/projects/foo/src/app/app.module.ts',
      '/projects/foo/src/app/app.component.css',
      '/projects/foo/src/app/app.component.html',
      '/projects/foo/src/app/app.component.spec.ts',
      '/projects/foo/src/app/app.component.ts',
    ]));
  });

  it('should add the application to the workspace', async () => {
    const options = { ...defaultOptions };

    const tree = await schematicRunner.runSchematicAsync('application', options, workspaceTree)
      .toPromise();
    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo).toBeDefined();
    expect(workspace.defaultProject).toBe('foo');
  });

  it('should set the prefix to app if none is set', async () => {
    const options = { ...defaultOptions };

    const tree = await schematicRunner.runSchematicAsync('application', options, workspaceTree)
      .toPromise();
    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo.prefix).toEqual('app');
  });

  it('should set the prefix correctly', async () => {
    const options = { ...defaultOptions, prefix: 'pre' };

    const tree = await schematicRunner.runSchematicAsync('application', options, workspaceTree)
      .toPromise();
    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo.prefix).toEqual('pre');
  });

  it('should handle the routing flag', async () => {
    const options = { ...defaultOptions, routing: true };

    const tree = await schematicRunner.runSchematicAsync('application', options, workspaceTree)
      .toPromise();
    const files = tree.files;
    expect(files).toContain('/projects/foo/src/app/app.module.ts');
    expect(files).toContain('/projects/foo/src/app/app-routing.module.ts');
    const moduleContent = tree.readContent('/projects/foo/src/app/app.module.ts');
    expect(moduleContent).toMatch(/import { AppRoutingModule } from '.\/app-routing.module'/);
    const routingModuleContent = tree.readContent('/projects/foo/src/app/app-routing.module.ts');
    expect(routingModuleContent).toMatch(/RouterModule.forRoot\(routes\)/);
  });

  it('should import BrowserModule in the app module', async () => {
    const tree = await schematicRunner.runSchematicAsync('application', defaultOptions, workspaceTree)
      .toPromise();
    const path = '/projects/foo/src/app/app.module.ts';
    const content = tree.readContent(path);
    expect(content).toMatch(/import { BrowserModule } from \'@angular\/platform-browser\';/);
  });

  it('should declare app component in the app module', async () => {
    const tree = await schematicRunner.runSchematicAsync('application', defaultOptions, workspaceTree)
      .toPromise();
    const path = '/projects/foo/src/app/app.module.ts';
    const content = tree.readContent(path);
    expect(content).toMatch(/import { AppComponent } from \'\.\/app\.component\';/);
  });

  it(`should set 'defaultEncapsulation' in main.ts when 'ViewEncapsulation' is provided`, async () => {
    const tree = await schematicRunner.runSchematicAsync('application', {
      ...defaultOptions,
      viewEncapsulation: ViewEncapsulation.ShadowDom,
    }, workspaceTree).toPromise();
    const path = '/projects/foo/src/main.ts';
    const content = tree.readContent(path);
    expect(content).toContain('defaultEncapsulation: ViewEncapsulation.ShadowDom');
    expect(content).toContain(`import { enableProdMode, ViewEncapsulation } from '@angular/core'`);
  });

  it('should set the right paths in the tsconfig files', async () => {
    const tree = await schematicRunner.runSchematicAsync('application', defaultOptions, workspaceTree)
      .toPromise();
    let path = '/projects/foo/tsconfig.app.json';
    let content = tree.readContent(path);
    expect(content).toMatch('../../tsconfig.json');
    path = '/projects/foo/tsconfig.spec.json';
    content = tree.readContent(path);
    expect(content).toMatch('../../tsconfig.json');
    const specTsConfig = JSON.parse(content);
    expect(specTsConfig.files).toEqual(['src/test.ts', 'src/polyfills.ts']);
  });

  it('should set the right path and prefix in the tslint file', async () => {
    const tree = await schematicRunner.runSchematicAsync('application', defaultOptions, workspaceTree)
      .toPromise();
    const path = '/projects/foo/tslint.json';
    const content = JSON.parse(tree.readContent(path));
    expect(content.extends).toMatch('../../tslint.json');
    expect(content.rules['directive-selector'][2]).toMatch('app');
    expect(content.rules['component-selector'][2]).toMatch('app');
  });

  it('should set the right prefix in the tslint file when provided is kebabed', async () => {
    const options: ApplicationOptions = { ...defaultOptions, prefix: 'foo-bar' };
    const tree = await schematicRunner.runSchematicAsync('application', options, workspaceTree)
      .toPromise();
    const path = '/projects/foo/tslint.json';
    const content = JSON.parse(tree.readContent(path));
    expect(content.rules['directive-selector'][2]).toMatch('fooBar');
    expect(content.rules['component-selector'][2]).toMatch('foo-bar');
  });

  it('should set the right coverage folder in the karma.json file', async () => {
    const tree = await schematicRunner.runSchematicAsync('application', defaultOptions, workspaceTree)
      .toPromise();
    const karmaConf = getFileContent(tree, '/projects/foo/karma.conf.js');
    expect(karmaConf).toContain(`dir: require('path').join(__dirname, '../../coverage/foo')`);
  });

  it('minimal=true should not create e2e, lint and test targets', async () => {
    const options = { ...defaultOptions, minimal: true };
    const tree = await schematicRunner.runSchematicAsync('application', options, workspaceTree)
      .toPromise();
    const config = JSON.parse(tree.readContent('/angular.json'));
    const architect = config.projects.foo.architect;
    expect(architect.test).not.toBeDefined();
    expect(architect.e2e).not.toBeDefined();
    expect(architect.e2e).not.toBeDefined();
  });

  it('should create correct files when using minimal', async () => {
    const options = { ...defaultOptions, minimal: true };
    const tree = await schematicRunner.runSchematicAsync('application', options, workspaceTree)
      .toPromise();
    const files = tree.files;
    [
      '/projects/foo/tsconfig.spec.json',
      '/projects/foo/tslint.json',
      '/projects/foo/karma.conf.js',
      '/projects/foo/src/test.ts',
      '/projects/foo/src/app/app.component.css',
      '/projects/foo/src/app/app.component.html',
      '/projects/foo/src/app/app.component.spec.ts',
    ].forEach(x => expect(files).not.toContain(x));

    expect(files).toEqual(jasmine.arrayContaining([
      '/projects/foo/tsconfig.app.json',
      '/projects/foo/src/environments/environment.ts',
      '/projects/foo/src/environments/environment.prod.ts',
      '/projects/foo/src/favicon.ico',
      '/projects/foo/src/index.html',
      '/projects/foo/src/main.ts',
      '/projects/foo/src/polyfills.ts',
      '/projects/foo/src/styles.css',
      '/projects/foo/src/app/app.module.ts',
      '/projects/foo/src/app/app.component.ts',
    ]));
  });

  describe(`update package.json`, () => {
    it(`should add build-angular to devDependencies`, async () => {
      const tree = await schematicRunner.runSchematicAsync('application', defaultOptions, workspaceTree)
        .toPromise();

      const packageJson = JSON.parse(tree.readContent('package.json'));
      expect(packageJson.devDependencies['@angular-devkit/build-angular'])
        .toEqual(latestVersions.DevkitBuildAngular);
    });

    it('should use the latest known versions in package.json', async () => {
      const tree = await schematicRunner.runSchematicAsync('application', defaultOptions, workspaceTree)
        .toPromise();
      const pkg = JSON.parse(tree.readContent('/package.json'));
      expect(pkg.devDependencies['@angular/compiler-cli']).toEqual(latestVersions.Angular);
      expect(pkg.devDependencies['typescript']).toEqual(latestVersions.TypeScript);
    });

    it(`should not override existing users dependencies`, async () => {
      const oldPackageJson = workspaceTree.readContent('package.json');
      workspaceTree.overwrite('package.json', oldPackageJson.replace(
        `"typescript": "${latestVersions.TypeScript}"`,
        `"typescript": "~2.5.2"`,
      ));

      const tree = await schematicRunner.runSchematicAsync('application', defaultOptions, workspaceTree)
        .toPromise();
      const packageJson = JSON.parse(tree.readContent('package.json'));
      expect(packageJson.devDependencies.typescript).toEqual('~2.5.2');
    });

    it(`should not modify the file when --skipPackageJson`, async () => {
      const tree = await schematicRunner.runSchematicAsync('application', {
        name: 'foo',
        skipPackageJson: true,
      }, workspaceTree).toPromise();

      const packageJson = JSON.parse(tree.readContent('package.json'));
      expect(packageJson.devDependencies['@angular-devkit/build-angular']).toBeUndefined();
    });

    it('should set the lint tsConfig option', async () => {
      const tree = await schematicRunner.runSchematicAsync('application', defaultOptions, workspaceTree)
        .toPromise();
      const workspace = JSON.parse(tree.readContent('/angular.json'));
      const lintOptions = workspace.projects.foo.architect.lint.options;
      expect(lintOptions.tsConfig).toEqual([
        'projects/foo/tsconfig.app.json',
        'projects/foo/tsconfig.spec.json',
        'projects/foo/e2e/tsconfig.json',
      ]);
    });
  });

  describe('custom projectRoot', () => {
    it('should put app files in the right spot', async () => {
      const options = { ...defaultOptions, projectRoot: '' };

      const tree = await schematicRunner.runSchematicAsync('application', options, workspaceTree)
        .toPromise();
      const files = tree.files;
      expect(files).toEqual(jasmine.arrayContaining([
        '/karma.conf.js',
        '/tsconfig.app.json',
        '/tsconfig.spec.json',
        '/tslint.json',
        '/src/environments/environment.ts',
        '/src/environments/environment.prod.ts',
        '/src/favicon.ico',
        '/src/index.html',
        '/src/main.ts',
        '/src/polyfills.ts',
        '/src/styles.css',
        '/src/test.ts',
        '/src/app/app.module.ts',
        '/src/app/app.component.css',
        '/src/app/app.component.html',
        '/src/app/app.component.spec.ts',
        '/src/app/app.component.ts',
      ]));
    });

    it('should set values in angular.json correctly', async () => {
      const options = { ...defaultOptions, projectRoot: '' };

      const tree = await schematicRunner.runSchematicAsync('application', options, workspaceTree)
        .toPromise();
      const config = JSON.parse(tree.readContent('/angular.json'));
      const prj = config.projects.foo;
      expect(prj.root).toEqual('');
      const buildOpt = prj.architect.build.options;
      expect(buildOpt.index).toEqual('src/index.html');
      expect(buildOpt.main).toEqual('src/main.ts');
      expect(buildOpt.polyfills).toEqual('src/polyfills.ts');
      expect(buildOpt.tsConfig).toEqual('tsconfig.app.json');

      const testOpt = prj.architect.test.options;
      expect(testOpt.main).toEqual('src/test.ts');
      expect(testOpt.tsConfig).toEqual('tsconfig.spec.json');
      expect(testOpt.karmaConfig).toEqual('karma.conf.js');
      expect(testOpt.styles).toEqual([
        'src/styles.css',
      ]);
    });

    it('should set values in angular.json correctly when using a style preprocessor', async () => {
      const options = { ...defaultOptions, projectRoot: '', style: Style.Sass };
      const tree = await schematicRunner.runSchematicAsync('application', options, workspaceTree)
        .toPromise();
      const config = JSON.parse(tree.readContent('/angular.json'));
      const prj = config.projects.foo;
      const buildOpt = prj.architect.build.options;
      expect(buildOpt.styles).toEqual([
        'src/styles.sass',
      ]);
      const testOpt = prj.architect.test.options;
      expect(testOpt.styles).toEqual([
        'src/styles.sass',
      ]);
      expect(tree.exists('src/styles.sass')).toBe(true);
    });

    it('should set the relative tsconfig paths', async () => {
      const options = { ...defaultOptions, projectRoot: '' };
      const tree = await schematicRunner.runSchematicAsync('application', options, workspaceTree)
        .toPromise();
      const appTsConfig = JSON.parse(tree.readContent('/tsconfig.app.json'));
      expect(appTsConfig.extends).toEqual('./tsconfig.json');
      const specTsConfig = JSON.parse(tree.readContent('/tsconfig.spec.json'));
      expect(specTsConfig.extends).toEqual('./tsconfig.json');
      expect(specTsConfig.files).toEqual(['src/test.ts', 'src/polyfills.ts']);
    });

    it('should set the relative path and prefix in the tslint file', async () => {
      const options = { ...defaultOptions, projectRoot: '' };

      const tree = await schematicRunner.runSchematicAsync('application', options, workspaceTree)
        .toPromise();
      const content = JSON.parse(tree.readContent('/tslint.json'));
      expect(content.extends).toMatch('tslint:recommended');
      expect(content.rules['directive-selector'][2]).toMatch('app');
      expect(content.rules['component-selector'][2]).toMatch('app');
    });

    it('should merge tslint file', async () => {
      const options = { ...defaultOptions, projectRoot: '' };

      const tree = await schematicRunner.runSchematicAsync('application', options, workspaceTree)
        .toPromise();
      const content = JSON.parse(tree.readContent('/tslint.json'));
      expect(content.extends).toMatch('tslint:recommended');
      expect(content.rules['component-selector'][2]).toMatch('app');
      expect(content.rules['trailing-comma']).toBeDefined();
    });

    it(`should create correct paths when 'newProjectRoot' is blank`, async () => {
      const workspaceTree = await schematicRunner.runSchematicAsync('workspace', { ...workspaceOptions, newProjectRoot: '' }).toPromise();
      const options = { ...defaultOptions, projectRoot: undefined };
      const tree = await schematicRunner.runSchematicAsync('application', options, workspaceTree)
        .toPromise();
      const config = JSON.parse(tree.readContent('/angular.json'));
      const project = config.projects.foo;
      expect(project.root).toEqual('foo');
      const buildOpt = project.architect.build.options;
      expect(buildOpt.index).toEqual('foo/src/index.html');
      expect(buildOpt.main).toEqual('foo/src/main.ts');
      expect(buildOpt.polyfills).toEqual('foo/src/polyfills.ts');
      expect(buildOpt.tsConfig).toEqual('foo/tsconfig.app.json');

      const appTsConfig = JSON.parse(tree.readContent('/foo/tsconfig.app.json'));
      expect(appTsConfig.extends).toEqual('../tsconfig.json');
      const specTsConfig = JSON.parse(tree.readContent('/foo/tsconfig.spec.json'));
      expect(specTsConfig.extends).toEqual('../tsconfig.json');
    });
  });
});

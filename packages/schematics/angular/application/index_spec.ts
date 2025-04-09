/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { parse as parseJson } from 'jsonc-parser';
import { latestVersions } from '../utility/latest-versions';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as ApplicationOptions, Style, ViewEncapsulation } from './schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readJsonFile(tree: UnitTestTree, path: string): any {
  return parseJson(tree.readContent(path).toString());
}

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
    skipPackageJson: false,
  };

  let workspaceTree: UnitTestTree;
  beforeEach(async () => {
    workspaceTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
  });

  it('should create all files of an application', async () => {
    const tree = await schematicRunner.runSchematic(
      'application',
      { ...defaultOptions, standalone: false },
      workspaceTree,
    );

    expect(tree.files).toEqual(
      jasmine.arrayContaining([
        '/projects/foo/tsconfig.app.json',
        '/projects/foo/tsconfig.spec.json',
        '/projects/foo/public/favicon.ico',
        '/projects/foo/src/index.html',
        '/projects/foo/src/main.ts',
        '/projects/foo/src/styles.css',
        '/projects/foo/src/app/app-module.ts',
        '/projects/foo/src/app/app.css',
        '/projects/foo/src/app/app.html',
        '/projects/foo/src/app/app.spec.ts',
        '/projects/foo/src/app/app.ts',
      ]),
    );
  });

  it('should add the application to the workspace', async () => {
    const options = { ...defaultOptions };

    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo).toBeDefined();
  });

  it('should set the prefix to app if none is set', async () => {
    const options = { ...defaultOptions };

    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo.prefix).toEqual('app');
  });

  it('should set the prefix correctly', async () => {
    const options = { ...defaultOptions, prefix: 'pre' };

    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.foo.prefix).toEqual('pre');
  });

  it('should set the right paths in the tsconfig.app.json', async () => {
    const tree = await schematicRunner.runSchematic('application', defaultOptions, workspaceTree);

    const {
      include,
      exclude,
      extends: _extends,
    } = readJsonFile(tree, '/projects/foo/tsconfig.app.json');
    expect(include).toEqual(['src/**/*.ts']);
    expect(exclude).toEqual(['src/**/*.spec.ts']);
    expect(_extends).toBe('../../tsconfig.json');
  });

  it('should set the right paths in the tsconfig.spec.json', async () => {
    const tree = await schematicRunner.runSchematic('application', defaultOptions, workspaceTree);

    const { extends: _extends } = readJsonFile(tree, '/projects/foo/tsconfig.spec.json');
    expect(_extends).toBe('../../tsconfig.json');
  });

  it('should install npm dependencies when `skipInstall` is false', async () => {
    await schematicRunner.runSchematic(
      'application',
      { ...defaultOptions, ssr: true, skipInstall: false },
      workspaceTree,
    );
    expect(schematicRunner.tasks.length).toBe(1);
    expect(schematicRunner.tasks[0].name).toBe('node-package');
    expect((schematicRunner.tasks[0].options as { command: string }).command).toBe('install');
  });

  it('should not install npm dependencies when `skipInstall` is true', async () => {
    await schematicRunner.runSchematic(
      'application',
      { ...defaultOptions, ssr: true, skipInstall: true },
      workspaceTree,
    );
    expect(schematicRunner.tasks.length).toBe(0);
  });

  it('should set the skipTests flag for other schematics when using --skipTests=true', async () => {
    const options: ApplicationOptions = { ...defaultOptions, skipTests: true };
    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    const config = JSON.parse(tree.readContent('/angular.json'));
    const schematics = config.projects.foo.schematics;

    expect(schematics['@schematics/angular:class']).toEqual({ skipTests: true });
    expect(schematics['@schematics/angular:component']).toEqual({ skipTests: true });
    expect(schematics['@schematics/angular:directive']).toEqual({ skipTests: true });
    expect(schematics['@schematics/angular:guard']).toEqual({ skipTests: true });
    expect(schematics['@schematics/angular:interceptor']).toEqual({ skipTests: true });
    expect(schematics['@schematics/angular:pipe']).toEqual({ skipTests: true });
    expect(schematics['@schematics/angular:resolver']).toEqual({ skipTests: true });
    expect(schematics['@schematics/angular:service']).toEqual({ skipTests: true });
  });

  it('minimal=true should not create e2e and test targets', async () => {
    const options = { ...defaultOptions, minimal: true };
    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    const config = JSON.parse(tree.readContent('/angular.json'));
    const architect = config.projects.foo.architect;
    expect(architect.test).not.toBeDefined();
    expect(architect.e2e).not.toBeDefined();
  });

  it('minimal=true should configure the schematics options for components', async () => {
    const options = { ...defaultOptions, minimal: true };
    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    const config = JSON.parse(tree.readContent('/angular.json'));
    const schematics = config.projects.foo.schematics;
    expect(schematics['@schematics/angular:component']).toEqual({
      inlineTemplate: true,
      inlineStyle: true,
      skipTests: true,
    });
  });

  it('minimal=true allows inlineStyle=false when configuring the schematics options for components', async () => {
    const options = { ...defaultOptions, minimal: true, inlineStyle: false };
    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    const config = JSON.parse(tree.readContent('/angular.json'));
    const schematics = config.projects.foo.schematics;
    expect(schematics['@schematics/angular:component']).toEqual({
      inlineTemplate: true,
      skipTests: true,
    });
  });

  it('minimal=true allows inlineTemplate=false when configuring the schematics options for components', async () => {
    const options = { ...defaultOptions, minimal: true, inlineTemplate: false };
    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    const config = JSON.parse(tree.readContent('/angular.json'));
    const schematics = config.projects.foo.schematics;
    expect(schematics['@schematics/angular:component']).toEqual({
      inlineStyle: true,
      skipTests: true,
    });
  });

  it(`should create an application with SSR features when 'ssr=true'`, async () => {
    const options = { ...defaultOptions, ssr: true };
    const filePath = '/projects/foo/src/server.ts';
    expect(workspaceTree.exists(filePath)).toBeFalse();
    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);
    expect(tree.exists(filePath)).toBeTrue();
  });

  it(`should not create an application with SSR features when 'ssr=false'`, async () => {
    const options = { ...defaultOptions, ssr: false };
    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);
    expect(tree.exists('/projects/foo/src/server.ts')).toBeFalse();
  });

  describe(`update package.json`, () => {
    it(`should add @angular/build to devDependencies`, async () => {
      const tree = await schematicRunner.runSchematic('application', defaultOptions, workspaceTree);

      const packageJson = JSON.parse(tree.readContent('package.json'));
      expect(packageJson.devDependencies['@angular/build']).toEqual(latestVersions.AngularBuild);
    });

    it('should use the latest known versions in package.json', async () => {
      const tree = await schematicRunner.runSchematic('application', defaultOptions, workspaceTree);

      const pkg = JSON.parse(tree.readContent('/package.json'));
      expect(pkg.devDependencies['@angular/compiler-cli']).toEqual(latestVersions.Angular);
      expect(pkg.devDependencies['typescript']).toEqual(latestVersions['typescript']);
    });

    it(`should not override existing users dependencies`, async () => {
      const oldPackageJson = workspaceTree.readContent('package.json');
      workspaceTree.overwrite(
        'package.json',
        oldPackageJson.replace(
          `"typescript": "${latestVersions['typescript']}"`,
          `"typescript": "~2.5.2"`,
        ),
      );

      const tree = await schematicRunner.runSchematic('application', defaultOptions, workspaceTree);

      const packageJson = JSON.parse(tree.readContent('package.json'));
      expect(packageJson.devDependencies.typescript).toEqual('~2.5.2');
    });

    it(`should not modify the file when --skipPackageJson`, async () => {
      const tree = await schematicRunner.runSchematic(
        'application',
        {
          name: 'foo',
          skipPackageJson: true,
        },
        workspaceTree,
      );

      const packageJson = JSON.parse(tree.readContent('package.json'));
      expect(packageJson.devDependencies['@angular-devkit/build-angular']).toBeUndefined();
    });
  });

  describe('custom projectRoot', () => {
    it('should put app files in the right spot', async () => {
      const options = { ...defaultOptions, projectRoot: '' };

      const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

      const files = tree.files;
      expect(files).toEqual(
        jasmine.arrayContaining([
          '/tsconfig.app.json',
          '/tsconfig.spec.json',
          '/public/favicon.ico',
          '/src/index.html',
          '/src/main.ts',
          '/src/styles.css',
          '/src/app/app.css',
          '/src/app/app.html',
          '/src/app/app.spec.ts',
          '/src/app/app.ts',
        ]),
      );
    });

    it('should set values in angular.json correctly', async () => {
      const options = { ...defaultOptions, projectRoot: '' };
      const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

      const config = JSON.parse(tree.readContent('/angular.json'));
      const prj = config.projects.foo;
      expect(prj.root).toEqual('');
      const buildOpt = prj.architect.build.options;
      expect(buildOpt.index).toEqual('src/index.html');
      expect(buildOpt.browser).toEqual('src/main.ts');
      expect(buildOpt.assets).toEqual([{ 'glob': '**/*', 'input': 'public' }]);
      expect(buildOpt.polyfills).toEqual(['zone.js']);
      expect(buildOpt.tsConfig).toEqual('tsconfig.app.json');

      const testOpt = prj.architect.test.options;
      expect(testOpt.tsConfig).toEqual('tsconfig.spec.json');
      expect(testOpt.karmaConfig).toBeUndefined();
      expect(testOpt.assets).toEqual([{ 'glob': '**/*', 'input': 'public' }]);
      expect(testOpt.styles).toEqual(['src/styles.css']);
    });

    it('should set values in angular.json correctly when using a style preprocessor', async () => {
      const options = { ...defaultOptions, projectRoot: '', style: Style.Sass };
      const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

      const config = JSON.parse(tree.readContent('/angular.json'));
      const prj = config.projects.foo;
      const buildOpt = prj.architect.build.options;
      expect(buildOpt.styles).toEqual(['src/styles.sass']);
      const testOpt = prj.architect.test.options;
      expect(testOpt.styles).toEqual(['src/styles.sass']);
      expect(tree.exists('src/styles.sass')).toBe(true);
    });

    it('sets "inlineStyleLanguage" in angular.json when using a style preprocessor', async () => {
      const options = { ...defaultOptions, projectRoot: '', style: Style.Sass };
      const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

      const config = JSON.parse(tree.readContent('/angular.json'));
      const prj = config.projects.foo;

      const buildOpt = prj.architect.build.options;
      expect(buildOpt.inlineStyleLanguage).toBe('sass');

      const testOpt = prj.architect.test.options;
      expect(testOpt.inlineStyleLanguage).toBe('sass');
    });

    it('does not set "inlineStyleLanguage" in angular.json when not using a style preprocessor', async () => {
      const options = { ...defaultOptions, projectRoot: '' };
      const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

      const config = JSON.parse(tree.readContent('/angular.json'));
      const prj = config.projects.foo;

      const buildOpt = prj.architect.build.options;
      expect(buildOpt.inlineStyleLanguage).toBeUndefined();

      const testOpt = prj.architect.test.options;
      expect(testOpt.inlineStyleLanguage).toBeUndefined();
    });

    it('does not set "inlineStyleLanguage" in angular.json when using CSS styles', async () => {
      const options = { ...defaultOptions, projectRoot: '', style: Style.Css };
      const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

      const config = JSON.parse(tree.readContent('/angular.json'));
      const prj = config.projects.foo;

      const buildOpt = prj.architect.build.options;
      expect(buildOpt.inlineStyleLanguage).toBeUndefined();

      const testOpt = prj.architect.test.options;
      expect(testOpt.inlineStyleLanguage).toBeUndefined();
    });

    it('should set the relative tsconfig paths', async () => {
      const options = { ...defaultOptions, projectRoot: '' };
      const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

      const appTsConfig = readJsonFile(tree, '/tsconfig.app.json');
      expect(appTsConfig.extends).toEqual('./tsconfig.json');
      const specTsConfig = readJsonFile(tree, '/tsconfig.spec.json');
      expect(specTsConfig.extends).toEqual('./tsconfig.json');
    });

    it(`should create correct paths when 'newProjectRoot' is blank`, async () => {
      const workspaceTree = await schematicRunner.runSchematic('workspace', {
        ...workspaceOptions,
        newProjectRoot: '',
      });

      const options = { ...defaultOptions, projectRoot: undefined };
      const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

      const config = JSON.parse(tree.readContent('/angular.json'));
      const project = config.projects.foo;
      expect(project.root).toEqual('foo');
      const buildOpt = project.architect.build.options;
      expect(buildOpt.index).toEqual('foo/src/index.html');
      expect(buildOpt.browser).toEqual('foo/src/main.ts');
      expect(buildOpt.polyfills).toEqual(['zone.js']);
      expect(buildOpt.tsConfig).toEqual('foo/tsconfig.app.json');
      expect(buildOpt.assets).toEqual([{ 'glob': '**/*', 'input': 'foo/public' }]);

      const testOpt = project.architect.test.options;
      expect(testOpt.tsConfig).toEqual('foo/tsconfig.spec.json');
      expect(testOpt.karmaConfig).toBeUndefined();
      expect(testOpt.assets).toEqual([{ 'glob': '**/*', 'input': 'foo/public' }]);
      expect(testOpt.styles).toEqual(['foo/src/styles.css']);

      const appTsConfig = readJsonFile(tree, '/foo/tsconfig.app.json');
      expect(appTsConfig.extends).toEqual('../tsconfig.json');
      const specTsConfig = readJsonFile(tree, '/foo/tsconfig.spec.json');
      expect(specTsConfig.extends).toEqual('../tsconfig.json');
    });
  });

  it(`should create kebab-case project folder names with camelCase project name`, async () => {
    const options: ApplicationOptions = { ...defaultOptions, name: 'myCool' };
    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    const exists = tree.exists('/projects/my-cool/tsconfig.app.json');
    expect(exists).toBeTrue();
  });

  it(`should create scoped kebab-case project folder names with camelCase project name`, async () => {
    const options: ApplicationOptions = { ...defaultOptions, name: '@foo/myCool' };
    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    const exists = tree.exists('/projects/foo/my-cool/tsconfig.app.json');
    expect(exists).toBeTrue();
  });

  it(`should create kebab-case project folder names with PascalCase project name`, async () => {
    const options: ApplicationOptions = { ...defaultOptions, name: 'MyCool' };
    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    const exists = tree.exists('/projects/my-cool/tsconfig.app.json');
    expect(exists).toBeTrue();
  });

  it(`should create scoped kebab-case project folder names with PascalCase project name`, async () => {
    const options: ApplicationOptions = { ...defaultOptions, name: '@foo/MyCool' };
    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    const exists = tree.exists('/projects/foo/my-cool/tsconfig.app.json');
    expect(exists).toBeTrue();
  });

  it('should support creating applications with `_` and `.` in name', async () => {
    const options = { ...defaultOptions, name: 'foo.bar_buz' };
    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    expect(tree.exists('/projects/foo.bar_buz/tsconfig.app.json')).toBeTrue();
  });

  it('should support creating scoped application', async () => {
    const scopedName = '@myscope/myapp';
    const options = { ...defaultOptions, name: scopedName };
    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    const cfg = JSON.parse(tree.readContent('/angular.json'));
    expect(cfg.projects['@myscope/myapp']).toBeDefined();
  });

  it('should create correct files when using minimal', async () => {
    const options = { ...defaultOptions, minimal: true };
    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    const files = tree.files;
    [
      '/projects/foo/tsconfig.spec.json',
      '/projects/foo/src/app/app.css',
      '/projects/foo/src/app/app.html',
      '/projects/foo/src/app/app.spec.ts',
    ].forEach((x) => expect(files).not.toContain(x));

    expect(files).toEqual(
      jasmine.arrayContaining([
        '/projects/foo/tsconfig.app.json',
        '/projects/foo/public/favicon.ico',
        '/projects/foo/src/index.html',
        '/projects/foo/src/main.ts',
        '/projects/foo/src/styles.css',
        '/projects/foo/src/app/app.ts',
      ]),
    );
  });

  it('should create correct files when using minimal and inlineStyle=false', async () => {
    const options = { ...defaultOptions, minimal: true, inlineStyle: false };
    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    const files = tree.files;
    [
      '/projects/foo/tsconfig.spec.json',
      '/projects/foo/karma.conf.js',
      '/projects/foo/src/test.ts',
      '/projects/foo/src/app/app.html',
      '/projects/foo/src/app/app.spec.ts',
    ].forEach((x) => expect(files).not.toContain(x));

    expect(files).toEqual(
      jasmine.arrayContaining([
        '/projects/foo/tsconfig.app.json',
        '/projects/foo/public/favicon.ico',
        '/projects/foo/src/index.html',
        '/projects/foo/src/main.ts',
        '/projects/foo/src/styles.css',
        '/projects/foo/src/app/app.css',
        '/projects/foo/src/app/app.ts',
      ]),
    );
  });

  it('should create correct files when using minimal and inlineTemplate=false', async () => {
    const options = { ...defaultOptions, minimal: true, inlineTemplate: false };
    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    const files = tree.files;
    [
      '/projects/foo/tsconfig.spec.json',
      '/projects/foo/karma.conf.js',
      '/projects/foo/src/test.ts',
      '/projects/foo/src/app/app.css',
      '/projects/foo/src/app/app.spec.ts',
    ].forEach((x) => expect(files).not.toContain(x));

    expect(files).toEqual(
      jasmine.arrayContaining([
        '/projects/foo/tsconfig.app.json',
        '/projects/foo/public/favicon.ico',
        '/projects/foo/src/index.html',
        '/projects/foo/src/main.ts',
        '/projects/foo/src/styles.css',
        '/projects/foo/src/app/app.html',
        '/projects/foo/src/app/app.ts',
      ]),
    );
  });

  it('should create all files of a standalone application', async () => {
    const options = { ...defaultOptions, standalone: true };

    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    const files = tree.files;
    expect(files).toEqual(
      jasmine.arrayContaining([
        '/projects/foo/tsconfig.app.json',
        '/projects/foo/tsconfig.spec.json',
        '/projects/foo/public/favicon.ico',
        '/projects/foo/src/index.html',
        '/projects/foo/src/main.ts',
        '/projects/foo/src/styles.css',
        '/projects/foo/src/app/app.config.ts',
        '/projects/foo/src/app/app.css',
        '/projects/foo/src/app/app.html',
        '/projects/foo/src/app/app.spec.ts',
        '/projects/foo/src/app/app.ts',
      ]),
    );
  });

  it('should not create any module files', async () => {
    const options = { ...defaultOptions, standalone: true };

    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);
    const moduleFiles = tree.files.filter((file) => file.endsWith('-module.ts'));
    expect(moduleFiles.length).toEqual(0);
  });

  it('should enable zone event coalescing by default', async () => {
    const options = { ...defaultOptions, standalone: true };

    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);
    const appConfig = tree.readContent('/projects/foo/src/app/app.config.ts');
    expect(appConfig).toContain('provideZoneChangeDetection({ eventCoalescing: true })');
  });

  it('should create a standalone component', async () => {
    const options = { ...defaultOptions, standalone: true };
    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);
    const component = tree.readContent('/projects/foo/src/app/app.ts');

    expect(component).not.toContain('standalone');
  });

  it('should create routing information by default', async () => {
    const options = { ...defaultOptions, standalone: true };

    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    expect(tree.files).toContain('/projects/foo/src/app/app.routes.ts');

    const component = tree.readContent('/projects/foo/src/app/app.ts');
    expect(component).toContain(`import { RouterOutlet } from '@angular/router';`);
    expect(component).toContain(`imports: [RouterOutlet]`);

    const config = tree.readContent('/projects/foo/src/app/app.config.ts');
    expect(config).toContain(`import { provideRouter } from '@angular/router';`);
    expect(config).toContain(`import { routes } from './app.routes';`);
    expect(config).toContain('provideRouter(routes)');
  });

  it('should create a main.ts', async () => {
    const options = { ...defaultOptions, standalone: true };
    const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

    const main = tree.readContent('/projects/foo/src/main.ts');
    expect(main).toContain('bootstrapApplication');
  });

  describe('standalone=false', () => {
    it('should add the ngZoneEventCoalescing option by default', async () => {
      const tree = await schematicRunner.runSchematic(
        'application',
        {
          ...defaultOptions,
          standalone: false,
        },
        workspaceTree,
      );

      const content = tree.readContent('/projects/foo/src/main.ts');
      expect(content).toContain('ngZoneEventCoalescing: true');
    });

    it(`should set 'defaultEncapsulation' in main.ts when 'ViewEncapsulation' is provided`, async () => {
      const tree = await schematicRunner.runSchematic(
        'application',
        {
          ...defaultOptions,
          standalone: false,
          viewEncapsulation: ViewEncapsulation.ShadowDom,
        },
        workspaceTree,
      );

      const path = '/projects/foo/src/main.ts';
      const content = tree.readContent(path);
      expect(content).toContain('defaultEncapsulation: ViewEncapsulation.ShadowDom');
      expect(content).toContain(`import { ViewEncapsulation } from '@angular/core'`);
    });

    it('should handle the routing flag', async () => {
      const options = { ...defaultOptions, routing: true, standalone: false };

      const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

      const files = tree.files;
      expect(files).toContain('/projects/foo/src/app/app-module.ts');
      expect(files).toContain('/projects/foo/src/app/app-routing-module.ts');
      const moduleContent = tree.readContent('/projects/foo/src/app/app-module.ts');
      expect(moduleContent).toMatch(/import { AppRoutingModule } from '.\/app-routing-module'/);
      const routingModuleContent = tree.readContent('/projects/foo/src/app/app-routing-module.ts');
      expect(routingModuleContent).toMatch(/RouterModule.forRoot\(routes\)/);
    });

    it('should import BrowserModule in the app module', async () => {
      const tree = await schematicRunner.runSchematic(
        'application',
        { ...defaultOptions, standalone: false },
        workspaceTree,
      );

      const path = '/projects/foo/src/app/app-module.ts';
      const content = tree.readContent(path);
      expect(content).toMatch(/import { BrowserModule } from '@angular\/platform-browser';/);
    });

    it('should declare app component in the app module', async () => {
      const tree = await schematicRunner.runSchematic(
        'application',
        { ...defaultOptions, standalone: false },
        workspaceTree,
      );

      const path = '/projects/foo/src/app/app-module.ts';
      const content = tree.readContent(path);
      expect(content).toMatch(/import { App } from '\.\/app';/);
    });

    it('should create all files of an application', async () => {
      const options = { ...defaultOptions, standalone: false };

      const tree = await schematicRunner.runSchematic('application', options, workspaceTree);

      const files = tree.files;
      expect(files).toEqual(
        jasmine.arrayContaining([
          '/projects/foo/tsconfig.app.json',
          '/projects/foo/tsconfig.spec.json',
          '/projects/foo/src/main.ts',
          '/projects/foo/src/styles.css',
          '/projects/foo/src/app/app-routing-module.ts',
          '/projects/foo/src/app/app-module.ts',
          '/projects/foo/src/app/app.css',
          '/projects/foo/src/app/app.html',
          '/projects/foo/src/app/app.spec.ts',
          '/projects/foo/src/app/app.ts',
        ]),
      );
    });

    it('should set the default schematic options to be standalone=false', async () => {
      const tree = await schematicRunner.runSchematic(
        'application',
        { ...defaultOptions, standalone: false },
        workspaceTree,
      );

      const workspace = JSON.parse(tree.readContent('/angular.json'));
      expect(workspace.projects.foo.schematics).toEqual(
        jasmine.objectContaining({
          '@schematics/angular:component': { standalone: false },
          '@schematics/angular:directive': { standalone: false },
          '@schematics/angular:pipe': { standalone: false },
        }),
      );
    });

    it('should add provideExperimentalZonelessChangeDetection() in app-module.ts when experimentalZoneless is true', async () => {
      const tree = await schematicRunner.runSchematic(
        'application',
        {
          ...defaultOptions,
          experimentalZoneless: true,
          standalone: false,
        },
        workspaceTree,
      );
      const path = '/projects/foo/src/app/app-module.ts';
      const fileContent = tree.readContent(path);
      expect(fileContent).toContain('provideExperimentalZonelessChangeDetection()');
    });

    it('should not add provideExperimentalZonelessChangeDetection() in app-module.ts when experimentalZoneless is false', async () => {
      const tree = await schematicRunner.runSchematic(
        'application',
        {
          ...defaultOptions,
          experimentalZoneless: false,
          standalone: false,
        },
        workspaceTree,
      );
      const path = '/projects/foo/src/app/app-module.ts';
      const fileContent = tree.readContent(path);
      expect(fileContent).not.toContain('provideExperimentalZonelessChangeDetection()');
    });

    it('should add provideExperimentalZonelessChangeDetection() when experimentalZoneless is true', async () => {
      const tree = await schematicRunner.runSchematic(
        'application',
        {
          ...defaultOptions,
          experimentalZoneless: true,
        },
        workspaceTree,
      );
      const path = '/projects/foo/src/app/app.config.ts';
      const fileContent = tree.readContent(path);
      expect(fileContent).toContain('provideExperimentalZonelessChangeDetection()');
    });

    it('should not add provideExperimentalZonelessChangeDetection() when experimentalZoneless is false', async () => {
      const tree = await schematicRunner.runSchematic(
        'application',
        {
          ...defaultOptions,
          experimentalZoneless: false,
        },
        workspaceTree,
      );
      const path = '/projects/foo/src/app/app.config.ts';
      const fileContent = tree.readContent(path);
      expect(fileContent).not.toContain('provideExperimentalZonelessChangeDetection()');
    });

    it('should not add provideZoneChangeDetection when experimentalZoneless is true', async () => {
      const tree = await schematicRunner.runSchematic(
        'application',
        {
          ...defaultOptions,
          experimentalZoneless: true,
        },
        workspaceTree,
      );
      const path = '/projects/foo/src/app/app.config.ts';
      const fileContent = tree.readContent(path);
      expect(fileContent).not.toContain('provideZoneChangeDetection');
    });
  });
});

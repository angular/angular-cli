/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function
import { JsonObject } from '@angular-devkit/core';
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { latestVersions } from '../../utility/latest-versions';


describe('Migration to v6', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  // tslint:disable-next-line:no-any
  let baseConfig: any;
  const defaultOptions = {};
  let tree: UnitTestTree;
  const oldConfigPath = `/.angular-cli.json`;
  const configPath = `/angular.json`;

  beforeEach(() => {
    baseConfig = {
      schema: './node_modules/@angular/cli/lib/config/schema.json',
      project: {
        name: 'foo',
      },
      apps: [
        {
          root: 'src',
          outDir: 'dist',
          assets: [
            'assets',
            'favicon.ico',
            { glob: '**/*', input: './assets/', output: './assets/' },
            { glob: 'favicon.ico', input: './', output: './' },
            {
              'glob': '**/*.*',
              'input': '../server/',
              'output': '../',
              'allowOutsideOutDir': true,
            },
          ],
          index: 'index.html',
          main: 'main.ts',
          polyfills: 'polyfills.ts',
          test: 'test.ts',
          tsconfig: 'tsconfig.app.json',
          testTsconfig: 'tsconfig.spec.json',
          prefix: 'app',
          styles: [
            'styles.css',
          ],
          stylePreprocessorOptions: {
            includePaths: [
              'styleInc',
            ],
          },
          scripts: [],
          environmentSource: 'environments/environment.ts',
          environments: {
            dev: 'environments/environment.ts',
            prod: 'environments/environment.prod.ts',
          },
        },
      ],
      e2e: {
        protractor: {
          config: './protractor.conf.js',
        },
      },
      lint: [
        {
          project: 'src/tsconfig.app.json',
          exclude: '**/node_modules/**',
        },
        {
          project: 'src/tsconfig.spec.json',
          exclude: '**/node_modules/**',
        },
        {
          project: 'e2e/tsconfig.e2e.json',
          exclude: '**/node_modules/**',
        },
      ],
      test: {
        karma: {
          config: './karma.conf.js',
        },
        codeCoverage: {
          exclude: [
            './excluded.spec.ts',
          ],
        },
      },
      defaults: {
        styleExt: 'css',
        build: {
          namedChunks: true,
        },
        serve: {
          port: 8080,
        },
      },
    };
    tree = new UnitTestTree(new EmptyTree());
    const packageJson = {
      devDependencies: {},
    };
    tree.create('/package.json', JSON.stringify(packageJson, null, 2));

    // Create a prod environment.
    tree.create('/src/environments/environment.prod.ts', `
      export const environment = {
        production: true
      };
    `);
    tree.create('/src/favicon.ico', '');
  });

  // tslint:disable-next-line:no-any
  function getConfig(tree: UnitTestTree): any {
    return JSON.parse(tree.readContent(configPath));
  }

  // tslint:disable-next-line:no-any
  function getTarget(tree: UnitTestTree, targetName: string): any {
    const project = getConfig(tree).projects.foo;

    return project.architect[targetName];
  }

  describe('file creation/deletion', () => {
    it('should delete the old config file', async () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      expect(tree.exists(oldConfigPath)).toEqual(false);
    });

    it('should create the new config file', async () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      expect(tree.exists(configPath)).toEqual(true);
    });

  });

  describe('config file contents', () => {
    it('should set root values', async () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      const config = getConfig(tree);
      expect(config.version).toEqual(1);
      expect(config.newProjectRoot).toEqual('projects');
      expect(config.defaultProject).toEqual('foo');
    });

    describe('schematics', () => {
      it('should define schematics collection root', async () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const config = getConfig(tree);
        expect(config.schematics['@schematics/angular:component']).toBeDefined();
      });

      function getSchematicConfig(host: UnitTestTree, name: string): JsonObject {
        return getConfig(host).schematics['@schematics/angular:' + name];
      }

      describe('component config', () => {
        it('should move prefix', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'component');
          expect(config.prefix).toEqual('app');
        });

        it('should move styleExt to component', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'component');
          expect(config.styleext).toEqual('css');
        });

        it('should move inlineStyle', async () => {
          baseConfig.defaults.component = { inlineStyle: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'component');
          expect(config.inlineStyle).toEqual(true);
        });

        it('should not move inlineStyle if not defined', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'component');
          expect(config.inlineStyle).toBeUndefined();
        });

        it('should move inlineTemplate', async () => {
          baseConfig.defaults.component = { inlineTemplate: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'component');
          expect(config.inlineTemplate).toEqual(true);
        });

        it('should not move inlineTemplate if not defined', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'component');
          expect(config.inlineTemplate).toBeUndefined();
        });

        it('should move flat', async () => {
          baseConfig.defaults.component = { flat: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'component');
          expect(config.flat).toEqual(true);
        });

        it('should not move flat if not defined', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'component');
          expect(config.flat).toBeUndefined();
        });

        it('should move spec', async () => {
          baseConfig.defaults.component = { spec: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'component');
          expect(config.spec).toEqual(true);
        });

        it('should not move spec if not defined', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'component');
          expect(config.spec).toBeUndefined();
        });

        it('should move viewEncapsulation', async () => {
          baseConfig.defaults.component = { viewEncapsulation: 'Native' };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'component');
          expect(config.viewEncapsulation).toEqual('Native');
        });

        it('should not move viewEncapsulation if not defined', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'component');
          expect(config.viewEncapsulation).toBeUndefined();
        });

        it('should move changeDetection', async () => {
          baseConfig.defaults.component = { changeDetection: 'OnPush' };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'component');
          expect(config.changeDetection).toEqual('OnPush');
        });

        it('should not move changeDetection if not defined', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'component');
          expect(config.changeDetection).toBeUndefined();
        });
      });

      describe('directive config', () => {
        it('should move prefix', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'directive');
          expect(config.prefix).toEqual('app');
        });

        it('should move flat', async () => {
          baseConfig.defaults.directive = { flat: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'directive');
          expect(config.flat).toEqual(true);
        });

        it('should not move flat if not defined', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'directive');
          expect(config.flat).toBeUndefined();
        });

        it('should move spec', async () => {
          baseConfig.defaults.directive = { spec: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'directive');
          expect(config.spec).toEqual(true);
        });

        it('should not move spec if not defined', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'directive');
          expect(config.spec).toBeUndefined();
        });
      });

      describe('class config', () => {
        it('should move spec', async () => {
          baseConfig.defaults.class = { spec: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'class');
          expect(config.spec).toEqual(true);
        });

        it('should not move spec if not defined', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'class');
          expect(config).toBeUndefined();
        });
      });

      describe('guard config', () => {
        it('should move flat', async () => {
          baseConfig.defaults.guard = { flat: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'guard');
          expect(config.flat).toEqual(true);
        });

        it('should not move flat if not defined', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'guard');
          expect(config).toBeUndefined();
        });

        it('should move spec', async () => {
          baseConfig.defaults.guard = { spec: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'guard');
          expect(config.spec).toEqual(true);
        });

        it('should not move spec if not defined', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'guard');
          expect(config).toBeUndefined();
        });
      });

      describe('interface config', () => {
        it('should move flat', async () => {
          baseConfig.defaults.interface = { prefix: 'I' };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'interface');
          expect(config.prefix).toEqual('I');
        });

        it('should not move flat if not defined', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'interface');
          expect(config).toBeUndefined();
        });
      });

      describe('module config', () => {
        it('should move flat', async () => {
          baseConfig.defaults.module = { flat: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'module');
          expect(config.flat).toEqual(true);
        });

        it('should not move flat if not defined', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'module');
          expect(config).toBeUndefined();
        });

        it('should move spec', async () => {
          baseConfig.defaults.module = { spec: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'module');
          expect(config.spec).toEqual(true);
        });

        it('should not move spec if not defined', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'module');
          expect(config).toBeUndefined();
        });
      });

      describe('pipe config', () => {
        it('should move flat', async () => {
          baseConfig.defaults.pipe = { flat: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'pipe');
          expect(config.flat).toEqual(true);
        });

        it('should not move flat if not defined', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'pipe');
          expect(config).toBeUndefined();
        });

        it('should move spec', async () => {
          baseConfig.defaults.pipe = { spec: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'pipe');
          expect(config.spec).toEqual(true);
        });

        it('should not move spec if not defined', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'pipe');
          expect(config).toBeUndefined();
        });
      });

      describe('service config', () => {
        it('should move flat', async () => {
          baseConfig.defaults.service = { flat: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'service');
          expect(config.flat).toEqual(true);
        });

        it('should not move flat if not defined', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'service');
          expect(config).toBeUndefined();
        });

        it('should move spec', async () => {
          baseConfig.defaults.service = { spec: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'service');
          expect(config.spec).toEqual(true);
        });

        it('should not move spec if not defined', async () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
          const config = getSchematicConfig(tree, 'service');
          expect(config).toBeUndefined();
        });
      });
    });

    describe('targets', () => {
      it('should exist', async () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const config = getConfig(tree);
        expect(config.architect).not.toBeDefined();
      });
    });

    describe('app projects', () => {
      it('should create two projects per app', async () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const config = getConfig(tree);
        expect(Object.keys(config.projects).length).toEqual(2);
      });

      it('should create two projects per app', async () => {
        baseConfig.apps.push(baseConfig.apps[0]);
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const config = getConfig(tree);
        expect(Object.keys(config.projects).length).toEqual(4);
      });

      it('should use the app name if defined', async () => {
        baseConfig.apps[0].name = 'foo';
        baseConfig.apps.push(baseConfig.apps[0]);
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const config = getConfig(tree);
        expect(config.projects.foo).toBeDefined();
        expect(config.projects['foo-e2e']).toBeDefined();
      });

      it('should set the project root values', async () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const project = getConfig(tree).projects.foo;
        expect(project.root).toEqual('');
        expect(project.sourceRoot).toEqual('src');
        expect(project.projectType).toEqual('application');
      });

      it('should set the project root values for a different root', async () => {
        baseConfig.apps[0].root = 'apps/app1/src';
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const project = getConfig(tree).projects.foo;
        expect(project.root).toEqual('apps/app1');
        expect(project.sourceRoot).toEqual('apps/app1/src');
        expect(project.projectType).toEqual('application');
      });

      it('should set build target', async () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const build = getTarget(tree, 'build');
        expect(build.builder).toEqual('@angular-devkit/build-angular:browser');
        expect(build.options.scripts).toEqual([]);
        expect(build.options.styles).toEqual(['src/styles.css']);
        expect(build.options.stylePreprocessorOptions).toEqual({includePaths: ['src/styleInc']});
        expect(build.options.assets).toEqual([
          'src/assets',
          'src/favicon.ico',
          { glob: '**/*', input: 'src/assets', output: '/assets' },
          { glob: 'favicon.ico', input: 'src', output: '/' },
        ]);
        expect(build.options.namedChunks).toEqual(true);
        expect(build.configurations).toEqual({
          production: {
            optimization: true,
            outputHashing: 'all',
            sourceMap: false,
            extractCss: true,
            namedChunks: false,
            aot: true,
            extractLicenses: true,
            vendorChunk: false,
            buildOptimizer: true,
            fileReplacements: [{
              replace: 'src/environments/environment.ts',
              with: 'src/environments/environment.prod.ts',
            }],
          },
        });
      });

      it('should not set baseHref on build & serve targets if not defined', async () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const build = getTarget(tree, 'build');
        expect(build.options.baseHref).toBeUndefined();
      });

      it('should set baseHref on build & serve targets if defined', async () => {
        const config = {...baseConfig};
        config.apps[0].baseHref = '/base/href/';
        tree.create(oldConfigPath, JSON.stringify(config, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const build = getTarget(tree, 'build');
        expect(build.options.baseHref).toEqual('/base/href/');
      });

      it('should add serviceWorker to production configuration', async () => {
        baseConfig.apps[0].serviceWorker = true;
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const build = getTarget(tree, 'build');
        expect(build.options.serviceWorker).toBeUndefined();
        expect(build.configurations.production.serviceWorker).toBe(true);
      });

      it('should add production configuration when no environments', async () => {
        delete baseConfig.apps[0].environments;
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const build = getTarget(tree, 'build');
        expect(build.configurations).toEqual({
          production: {
            optimization: true,
            outputHashing: 'all',
            sourceMap: false,
            extractCss: true,
            namedChunks: false,
            aot: true,
            extractLicenses: true,
            vendorChunk: false,
            buildOptimizer: true,
          },
        });
      });

      it('should add production configuration when no production environment', async () => {
        tree.delete('/src/environments/environment.prod.ts');
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const build = getTarget(tree, 'build');
        expect(build.configurations).toEqual({
          prod: {
            fileReplacements: [{
              replace: 'src/environments/environment.ts',
              with: 'src/environments/environment.prod.ts',
            }],
          },
          production: {
            optimization: true,
            outputHashing: 'all',
            sourceMap: false,
            extractCss: true,
            namedChunks: false,
            aot: true,
            extractLicenses: true,
            vendorChunk: false,
            buildOptimizer: true,
          },
        });
      });

      it('should set the serve target', async () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const serve = getTarget(tree, 'serve');
        expect(serve.builder).toEqual('@angular-devkit/build-angular:dev-server');
        expect(serve.options).toEqual({
          browserTarget: 'foo:build',
          port: 8080,
        });
        const prodConfig = serve.configurations.production;
        expect(prodConfig.browserTarget).toEqual('foo:build:production');
      });

      it('should set the test target', async () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const test = getTarget(tree, 'test');
        expect(test.builder).toEqual('@angular-devkit/build-angular:karma');
        expect(test.options.main).toEqual('src/test.ts');
        expect(test.options.polyfills).toEqual('src/polyfills.ts');
        expect(test.options.tsConfig).toEqual('src/tsconfig.spec.json');
        expect(test.options.karmaConfig).toEqual('./karma.conf.js');
        expect(test.options.codeCoverageExclude).toEqual(['./excluded.spec.ts']);
        expect(test.options.scripts).toEqual([]);
        expect(test.options.styles).toEqual(['src/styles.css']);
        expect(test.options.assets).toEqual([
          'src/assets',
          'src/favicon.ico',
          { glob: '**/*', input: 'src/assets', output: '/assets' },
          { glob: 'favicon.ico', input: 'src', output: '/' },
        ]);
      });

      it('should set the extract i18n target', async () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const extract = getTarget(tree, 'extract-i18n');
        expect(extract.builder).toEqual('@angular-devkit/build-angular:extract-i18n');
        expect(extract.options).toBeDefined();
        expect(extract.options.browserTarget).toEqual(`foo:build` );
      });

      it('should set the lint target', async () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const tslint = getTarget(tree, 'lint');
        expect(tslint.builder).toEqual('@angular-devkit/build-angular:tslint');
        expect(tslint.options).toBeDefined();
        expect(tslint.options.tsConfig)
          .toEqual(['src/tsconfig.app.json', 'src/tsconfig.spec.json']);
        expect(tslint.options.exclude).toEqual([ '**/node_modules/**' ]);
      });

      it('should set the budgets configuration', async () => {
        baseConfig.apps[0].budgets = [{
          type: 'bundle',
          name: 'main',
          error: '123kb',
        }];

        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const build = getTarget(tree, 'build');
        const budgets = build.configurations.production.budgets;
        expect(budgets.length).toEqual(1);
        expect(budgets[0].type).toEqual('bundle');
        expect(budgets[0].name).toEqual('main');
        expect(budgets[0].error).toEqual('123kb');
      });
    });

    describe('e2e projects', () => {
      it('should set the project root values', async () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const e2eProject = getConfig(tree).projects['foo-e2e'];
        expect(e2eProject.root).toBe('e2e');
        expect(e2eProject.sourceRoot).toBe('e2e');
        const e2eOptions = e2eProject.architect.e2e;
        expect(e2eOptions.builder).toEqual('@angular-devkit/build-angular:protractor');
        const options = e2eOptions.options;
        expect(options.protractorConfig).toEqual('./protractor.conf.js');
        expect(options.devServerTarget).toEqual('foo:serve');
      });

      it('should set the project root values for a different root', async () => {
        baseConfig.apps[0].root = 'apps/app1/src';
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const e2eProject = getConfig(tree).projects['foo-e2e'];
        expect(e2eProject.root).toBe('apps/app1/e2e');
        expect(e2eProject.sourceRoot).toBe('apps/app1/e2e');
        const e2eOptions = e2eProject.architect.e2e;
        expect(e2eOptions.builder).toEqual('@angular-devkit/build-angular:protractor');
        const options = e2eOptions.options;
        expect(options.protractorConfig).toEqual('./protractor.conf.js');
        expect(options.devServerTarget).toEqual('foo:serve');
      });

      it('should set the lint target', async () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
        const tslint = getConfig(tree).projects['foo-e2e'].architect.lint;
        expect(tslint.builder).toEqual('@angular-devkit/build-angular:tslint');
        expect(tslint.options).toBeDefined();
        expect(tslint.options.tsConfig).toEqual(['e2e/tsconfig.e2e.json']);
        expect(tslint.options.exclude).toEqual([ '**/node_modules/**' ]);
      });
    });
  });

  describe('karma config', () => {
    const karmaPath = '/karma.conf.js';
    beforeEach(() => {
      tree.create(karmaPath, `
        // @angular/cli
        // reports
      `);
    });

    it('should replace references to "@angular/cli"', async () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      const content = tree.readContent(karmaPath);
      expect(content).not.toContain('@angular/cli');
      expect(content).toContain('@angular-devkit/build-angular');
    });

    it('should replace references to "reports"', async () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      const content = tree.readContent(karmaPath);
      expect(content).toContain(`dir: require('path').join(__dirname, 'coverage'), reports`);
    });

    it('should remove unused properties in 1.0 configs', async () => {
      tree.overwrite(karmaPath, `
        files: [
          { pattern: './src/test.ts', watched: false }
        ],
        preprocessors: {
          './src/test.ts': ['@angular/cli']
        },
        angularCli: {
          environment: 'dev'
        },
      `);

      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      const content = tree.readContent(karmaPath);
      expect(content).not.toContain(`{ pattern: './src/test.ts', watched: false }`);
      expect(content).not.toContain(`'./src/test.ts': ['@angular/cli']`);
      expect(content).not.toMatch(/angularCli[^}]*},?/);
    });
  });

  describe('spec ts config', () => {
    const testTsconfigPath = '/src/tsconfig.spec.json';
    beforeEach(() => {
      tree.create(testTsconfigPath, `
        {
          "files": [ "test.ts" ]
        }
      `);
    });

    it('should add polyfills', async () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      const content = tree.readContent(testTsconfigPath);
      expect(content).toContain('polyfills.ts');
      const config = JSON.parse(content);
      expect(config.files.length).toEqual(2);
      expect(config.files[1]).toEqual('polyfills.ts');
    });

    it('should not add polyfills it if it already exists', async () => {
      tree.overwrite(testTsconfigPath, `
        {
          "files": [ "test.ts", "polyfills.ts" ]
        }
      `);
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      const content = tree.readContent(testTsconfigPath);
      expect(content).toContain('polyfills.ts');
      const config = JSON.parse(content);
      expect(config.files.length).toEqual(2);
    });
  });

  describe('root ts config', () => {
    const rootTsConfig = '/tsconfig.json';
    let compilerOptions: JsonObject;

    beforeEach(async () => {
      tree.create(rootTsConfig, `
        {
          "compilerOptions": {
            "noEmitOnError": true
          }
        }
      `);

      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      const content = tree.readContent(rootTsConfig);
      compilerOptions = JSON.parse(content).compilerOptions;
    });

    it('should add baseUrl', () => {
      expect(compilerOptions.baseUrl).toEqual('./');
    });

    it('should add module', () => {
      expect(compilerOptions.module).toEqual('es2015');
    });

    it('should not remove existing options', () => {
      expect(compilerOptions.noEmitOnError).toBeDefined();
    });
  });

  describe('package.json', () => {
    it('should add a dev dependency to @angular-devkit/build-angular', async () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      const content = tree.readContent('/package.json');
      const pkg = JSON.parse(content);
      expect(pkg.devDependencies['@angular-devkit/build-angular'])
        .toBe(latestVersions.DevkitBuildAngular);
    });

    it('should add a dev dependency to @angular-devkit/build-angular (present)', async () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree.overwrite('/package.json', JSON.stringify({
        devDependencies: {
          '@angular-devkit/build-angular': '0.0.0',
        },
      }, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      const content = tree.readContent('/package.json');
      const pkg = JSON.parse(content);
      expect(pkg.devDependencies['@angular-devkit/build-angular'])
        .toBe(latestVersions.DevkitBuildAngular);
    });

    it('should add a dev dependency to @angular-devkit/build-angular (no dev)', async () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree.overwrite('/package.json', JSON.stringify({}, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      const content = tree.readContent('/package.json');
      const pkg = JSON.parse(content);
      expect(pkg.devDependencies['@angular-devkit/build-angular'])
        .toBe(latestVersions.DevkitBuildAngular);
    });
  });

  describe('tslint.json', () => {
    const tslintPath = '/tslint.json';
    // tslint:disable-next-line:no-any
    let tslintConfig: any;
    beforeEach(() => {
      tslintConfig = {
        rules: {
          'import-blacklist': ['some', 'rxjs', 'else'],
        },
      };
    });

    it('should remove "rxjs" from the "import-blacklist" rule', async () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree.create(tslintPath, JSON.stringify(tslintConfig, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      const tslint = JSON.parse(tree.readContent(tslintPath));
      expect(tslint.rules['import-blacklist']).toEqual(['some', 'else']);
    });

    it('should remove "rxjs" from the "import-blacklist" rule (only)', async () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tslintConfig.rules['import-blacklist'] = ['rxjs'];
      tree.create(tslintPath, JSON.stringify(tslintConfig, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      const tslint = JSON.parse(tree.readContent(tslintPath));
      expect(tslint.rules['import-blacklist']).toEqual([]);
    });

    it('should remove "rxjs" from the "import-blacklist" rule (first)', async () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tslintConfig.rules['import-blacklist'] = ['rxjs', 'else'];
      tree.create(tslintPath, JSON.stringify(tslintConfig, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      const tslint = JSON.parse(tree.readContent(tslintPath));
      expect(tslint.rules['import-blacklist']).toEqual(['else']);
    });

    it('should remove "rxjs" from the "import-blacklist" rule (last)', async () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tslintConfig.rules['import-blacklist'] = ['some', 'rxjs'];
      tree.create(tslintPath, JSON.stringify(tslintConfig, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      const tslint = JSON.parse(tree.readContent(tslintPath));
      expect(tslint.rules['import-blacklist']).toEqual(['some']);
    });

    it('should work if "rxjs" is not in the "import-blacklist" rule', async () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tslintConfig.rules['import-blacklist'] = [];
      tree.create(tslintPath, JSON.stringify(tslintConfig, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      const tslint = JSON.parse(tree.readContent(tslintPath));
      const blacklist = tslint.rules['import-blacklist'];
      expect(blacklist).toEqual([]);
    });
  });

  describe('server/universal apps', () => {
    let serverApp;
    beforeEach(() => {
      serverApp = {
        platform: 'server',
        root: 'src',
        outDir: 'dist/server',
        assets: [
          'assets',
          'favicon.ico',
        ],
        index: 'index.html',
        main: 'main.server.ts',
        test: 'test.ts',
        tsconfig: 'tsconfig.server.json',
        testTsconfig: 'tsconfig.spec.json',
        prefix: 'app',
        styles: [
          'styles.css',
        ],
        scripts: [],
        environmentSource: 'environments/environment.ts',
        environments: {
          dev: 'environments/environment.ts',
          prod: 'environments/environment.prod.ts',
        },
      };
      baseConfig.apps.push(serverApp);
    });

    it('should not create a separate app for server apps', async () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      const config = getConfig(tree);
      const appCount = Object.keys(config.projects).length;
      expect(appCount).toEqual(2);
    });

    it('should create a server target', async () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = await schematicRunner.runSchematicAsync('migration-01', defaultOptions, tree).toPromise();
      const config = getConfig(tree);
      const target = config.projects.foo.architect.server;
      expect(target).toBeDefined();
      expect(target.builder).toEqual('@angular-devkit/build-angular:server');
      expect(target.options.outputPath).toEqual('dist/server');
      expect(target.options.main).toEqual('src/main.server.ts');
      expect(target.options.tsConfig).toEqual('src/tsconfig.server.json');
    });
  });
});

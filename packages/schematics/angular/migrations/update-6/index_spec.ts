/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject } from '@angular-devkit/core';
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'path';


describe('Migration to v6', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    path.join(__dirname, '../migration-collection.json'),
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

  describe('file creation/deletion', () => {
    it('should delete the old config file', () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
      expect(tree.exists(oldConfigPath)).toEqual(false);
    });

    it('should create the new config file', () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
      expect(tree.exists(configPath)).toEqual(true);
    });

  });

  describe('config file contents', () => {
    // tslint:disable-next-line:no-any
    function getConfig(tree: UnitTestTree): any {
      return JSON.parse(tree.readContent(configPath));
    }

    it('should set root values', () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
      const config = getConfig(tree);
      expect(config.version).toEqual(1);
      expect(config.newProjectRoot).toEqual('projects');
    });

    describe('schematics', () => {
      it('should define schematics collection root', () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
        const config = getConfig(tree);
        expect(config.schematics['@schematics/angular:component']).toBeDefined();
      });

      function getSchematicConfig(host: UnitTestTree, name: string): JsonObject {
        return getConfig(host).schematics['@schematics/angular:' + name];
      }

      describe('component config', () => {
        it('should move prefix', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'component');
          expect(config.prefix).toEqual('app');
        });

        it('should move styleExt to component', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'component');
          expect(config.styleext).toEqual('css');
        });

        it('should move inlineStyle', () => {
          baseConfig.defaults.component = { inlineStyle: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'component');
          expect(config.inlineStyle).toEqual(true);
        });

        it('should not move inlineStyle if not defined', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'component');
          expect(config.inlineStyle).toBeUndefined();
        });

        it('should move inlineTemplate', () => {
          baseConfig.defaults.component = { inlineTemplate: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'component');
          expect(config.inlineTemplate).toEqual(true);
        });

        it('should not move inlineTemplate if not defined', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'component');
          expect(config.inlineTemplate).toBeUndefined();
        });

        it('should move flat', () => {
          baseConfig.defaults.component = { flat: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'component');
          expect(config.flat).toEqual(true);
        });

        it('should not move flat if not defined', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'component');
          expect(config.flat).toBeUndefined();
        });

        it('should move spec', () => {
          baseConfig.defaults.component = { spec: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'component');
          expect(config.spec).toEqual(true);
        });

        it('should not move spec if not defined', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'component');
          expect(config.spec).toBeUndefined();
        });

        it('should move viewEncapsulation', () => {
          baseConfig.defaults.component = { viewEncapsulation: 'Native' };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'component');
          expect(config.viewEncapsulation).toEqual('Native');
        });

        it('should not move viewEncapsulation if not defined', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'component');
          expect(config.viewEncapsulation).toBeUndefined();
        });

        it('should move changeDetection', () => {
          baseConfig.defaults.component = { changeDetection: 'OnPush' };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'component');
          expect(config.changeDetection).toEqual('OnPush');
        });

        it('should not move changeDetection if not defined', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'component');
          expect(config.changeDetection).toBeUndefined();
        });
      });

      describe('directive config', () => {
        it('should move prefix', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'directive');
          expect(config.prefix).toEqual('app');
        });

        it('should move flat', () => {
          baseConfig.defaults.directive = { flat: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'directive');
          expect(config.flat).toEqual(true);
        });

        it('should not move flat if not defined', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'directive');
          expect(config.flat).toBeUndefined();
        });

        it('should move spec', () => {
          baseConfig.defaults.directive = { spec: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'directive');
          expect(config.spec).toEqual(true);
        });

        it('should not move spec if not defined', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'directive');
          expect(config.spec).toBeUndefined();
        });
      });

      describe('class config', () => {
        it('should move spec', () => {
          baseConfig.defaults.class = { spec: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'class');
          expect(config.spec).toEqual(true);
        });

        it('should not move spec if not defined', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'class');
          expect(config).toBeUndefined();
        });
      });

      describe('guard config', () => {
        it('should move flat', () => {
          baseConfig.defaults.guard = { flat: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'guard');
          expect(config.flat).toEqual(true);
        });

        it('should not move flat if not defined', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'guard');
          expect(config).toBeUndefined();
        });

        it('should move spec', () => {
          baseConfig.defaults.guard = { spec: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'guard');
          expect(config.spec).toEqual(true);
        });

        it('should not move spec if not defined', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'guard');
          expect(config).toBeUndefined();
        });
      });

      describe('interface config', () => {
        it('should move flat', () => {
          baseConfig.defaults.interface = { prefix: 'I' };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'interface');
          expect(config.prefix).toEqual('I');
        });

        it('should not move flat if not defined', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'interface');
          expect(config).toBeUndefined();
        });
      });

      describe('module config', () => {
        it('should move flat', () => {
          baseConfig.defaults.module = { flat: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'module');
          expect(config.flat).toEqual(true);
        });

        it('should not move flat if not defined', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'module');
          expect(config).toBeUndefined();
        });

        it('should move spec', () => {
          baseConfig.defaults.module = { spec: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'module');
          expect(config.spec).toEqual(true);
        });

        it('should not move spec if not defined', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'module');
          expect(config).toBeUndefined();
        });
      });

      describe('pipe config', () => {
        it('should move flat', () => {
          baseConfig.defaults.pipe = { flat: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'pipe');
          expect(config.flat).toEqual(true);
        });

        it('should not move flat if not defined', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'pipe');
          expect(config).toBeUndefined();
        });

        it('should move spec', () => {
          baseConfig.defaults.pipe = { spec: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'pipe');
          expect(config.spec).toEqual(true);
        });

        it('should not move spec if not defined', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'pipe');
          expect(config).toBeUndefined();
        });
      });

      describe('service config', () => {
        it('should move flat', () => {
          baseConfig.defaults.service = { flat: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'service');
          expect(config.flat).toEqual(true);
        });

        it('should not move flat if not defined', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'service');
          expect(config).toBeUndefined();
        });

        it('should move spec', () => {
          baseConfig.defaults.service = { spec: true };
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'service');
          expect(config.spec).toEqual(true);
        });

        it('should not move spec if not defined', () => {
          tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
          tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
          const config = getSchematicConfig(tree, 'service');
          expect(config).toBeUndefined();
        });
      });
    });

    describe('architect', () => {
      it('should exist', () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
        const config = getConfig(tree);
        expect(config.architect).not.toBeDefined();
      });
    });

    describe('app projects', () => {
      it('should create two projects per app', () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
        const config = getConfig(tree);
        expect(Object.keys(config.projects).length).toEqual(2);
      });

      it('should create two projects per app', () => {
        baseConfig.apps.push(baseConfig.apps[0]);
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
        const config = getConfig(tree);
        expect(Object.keys(config.projects).length).toEqual(4);
      });

      it('should use the app name if defined', () => {
        baseConfig.apps[0].name = 'foo';
        baseConfig.apps.push(baseConfig.apps[0]);
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
        const config = getConfig(tree);
        expect(config.projects.foo).toBeDefined();
        expect(config.projects['foo-e2e']).toBeDefined();
      });

      it('should set the project root values', () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
        const project = getConfig(tree).projects.foo;
        expect(project.root).toEqual('');
        expect(project.projectType).toEqual('application');
      });

      it('should set build target', () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
        const build = getConfig(tree).projects.foo.architect.build;
        expect(build.builder).toEqual('@angular-devkit/build-angular:browser');
        expect(build.options.scripts).toEqual([]);
        expect(build.options.styles).toEqual([{ input: 'src/styles.css' }]);
        expect(build.options.assets).toEqual([
          { glob: '**/*', input: 'src/assets', output: '/assets' },
          { glob: 'favicon.ico', input: 'src', output: '/' },
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
              src: 'src/environments/environment.ts',
              replaceWith: 'src/environments/environment.prod.ts',
            }],
          },
        });
      });

      it('should add serviceWorker to production configuration', () => {
        baseConfig.apps[0].serviceWorker = true;
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
        const config = getConfig(tree);
        expect(config.projects.foo.architect.build.options.serviceWorker).toBeUndefined();
        expect(
          config.projects.foo.architect.build.configurations.production.serviceWorker,
        ).toBe(true);
      });

      it('should set the serve target', () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
        const serve = getConfig(tree).projects.foo.architect.serve;
        expect(serve.builder).toEqual('@angular-devkit/build-angular:dev-server');
        expect(serve.options).toEqual({
          browserTarget: 'foo:build',
          port: 8080,
        });
        const prodConfig = serve.configurations.production;
        expect(prodConfig.browserTarget).toEqual('foo:build:production');
      });

      it('should set the test target', () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
        const test = getConfig(tree).projects.foo.architect['test'];
        expect(test.builder).toEqual('@angular-devkit/build-angular:karma');
        expect(test.options.main).toEqual('src/test.ts');
        expect(test.options.polyfills).toEqual('src/polyfills.ts');
        expect(test.options.tsConfig).toEqual('src/tsconfig.spec.json');
        expect(test.options.karmaConfig).toEqual('./karma.conf.js');
        expect(test.options.scripts).toEqual([]);
        expect(test.options.styles).toEqual([{ input: 'src/styles.css' }]);
        expect(test.options.assets).toEqual([
          { glob: '**/*', input: 'src/assets', output: '/assets' },
          { glob: 'favicon.ico', input: 'src', output: '/' },
          { glob: '**/*', input: 'src/assets', output: '/assets' },
          { glob: 'favicon.ico', input: 'src', output: '/' },
        ]);
      });

      it('should set the extract i18n target', () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
        const extract = getConfig(tree).projects.foo.architect['extract-i18n'];
        expect(extract.builder).toEqual('@angular-devkit/build-angular:extract-i18n');
        expect(extract.options).toBeDefined();
        expect(extract.options.browserTarget).toEqual(`foo:build` );
      });

      it('should set the lint target', () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
        const tslint = getConfig(tree).projects.foo.architect['lint'];
        expect(tslint.builder).toEqual('@angular-devkit/build-angular:tslint');
        expect(tslint.options).toBeDefined();
        expect(tslint.options.tsConfig)
          .toEqual(['src/tsconfig.app.json', 'src/tsconfig.spec.json']);
        expect(tslint.options.exclude).toEqual([ '**/node_modules/**' ]);
      });
    });

    describe('e2e projects', () => {
      it('should set the project root values', () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
        const e2e = getConfig(tree).projects['foo-e2e'].architect.e2e;
        expect(e2e.builder).toEqual('@angular-devkit/build-angular:protractor');
        const options = e2e.options;
        expect(options.protractorConfig).toEqual('./protractor.conf.js');
        expect(options.devServerTarget).toEqual('foo:serve');
      });

      it('should set the lint target', () => {
        tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
        tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
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

    it('should replace references to "@angular/cli"', () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
      const content = tree.readContent(karmaPath);
      expect(content).not.toContain('@angular/cli');
      expect(content).toContain('@angular-devkit/build-angular');
    });

    it('should replace references to "reports"', () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
      const content = tree.readContent(karmaPath);
      expect(content).toContain(`dir: require('path').join(__dirname, 'coverage'), reports`);
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

    it('should add polyfills', () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
      const content = tree.readContent(testTsconfigPath);
      expect(content).toContain('polyfills.ts');
      const config = JSON.parse(content);
      expect(config.files.length).toEqual(2);
      expect(config.files[1]).toEqual('polyfills.ts');
    });

    it('should not add polyfills it if it already exists', () => {
      tree.overwrite(testTsconfigPath, `
        {
          "files": [ "test.ts", "polyfills.ts" ]
        }
      `);
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
      const content = tree.readContent(testTsconfigPath);
      expect(content).toContain('polyfills.ts');
      const config = JSON.parse(content);
      expect(config.files.length).toEqual(2);
    });
  });

  describe('package.json', () => {
    it('should add a dev dependency to @angular-devkit/build-angular', () => {
      tree.create(oldConfigPath, JSON.stringify(baseConfig, null, 2));
      tree = schematicRunner.runSchematic('migration-01', defaultOptions, tree);
      const content = tree.readContent('/package.json');
      const pkg = JSON.parse(content);
      expect(pkg.devDependencies['@angular-devkit/build-angular']).toBeDefined();
    });
  });
});

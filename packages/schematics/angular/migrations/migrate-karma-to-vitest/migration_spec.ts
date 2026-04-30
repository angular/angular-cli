/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { latestVersions } from '../../utility/latest-versions';

describe('Migration from Karma to Vitest unit-test builder', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    tree.create(
      '/package.json',
      JSON.stringify({
        devDependencies: {
          '@angular/build': latestVersions.AngularBuild,
        },
      }),
    );
    tree.create(
      '/angular.json',
      JSON.stringify({
        version: 1,
        projects: {
          app: {
            root: '',
            sourceRoot: 'src',
            projectType: 'application',
            targets: {
              build: {
                builder: '@angular/build:application',
                options: {
                  tsConfig: 'tsconfig.app.json',
                },
              },
              test: {
                builder: '@angular/build:karma',
                options: {
                  tsConfig: 'tsconfig.spec.json',
                  karmaConfig: 'karma.conf.js',
                },
              },
            },
          },
        },
      }),
    );
  });

  it('should migrate standard karma builder to unit-test builder', async () => {
    const newTree = await schematicRunner.runSchematic('migrate-karma-to-vitest', {}, tree);
    const { projects } = newTree.readJson('/angular.json') as any;

    expect(projects.app.targets.test.builder).toBe('@angular/build:unit-test');
    expect(projects.app.targets.test.options.runner).toBe('vitest');
    expect(projects.app.targets.test.options.karmaConfig).toBeUndefined();
  });

  it('should map codeCoverage to coverage', async () => {
    const { projects } = tree.readJson('/angular.json') as any;
    projects.app.targets.test.options.codeCoverage = true;
    tree.overwrite('/angular.json', JSON.stringify({ version: 1, projects }));

    const newTree = await schematicRunner.runSchematic('migrate-karma-to-vitest', {}, tree);
    const { projects: newProjects } = newTree.readJson('/angular.json') as any;

    expect(newProjects.app.targets.test.options.coverage).toBeTrue();
    expect(newProjects.app.targets.test.options.codeCoverage).toBeUndefined();
  });

  it('should map browsers string to array', async () => {
    const { projects } = tree.readJson('/angular.json') as any;
    projects.app.targets.test.options.browsers = 'Chrome,Firefox';
    tree.overwrite('/angular.json', JSON.stringify({ version: 1, projects }));

    const newTree = await schematicRunner.runSchematic('migrate-karma-to-vitest', {}, tree);
    const { projects: newProjects } = newTree.readJson('/angular.json') as any;

    expect(newProjects.app.targets.test.options.browsers).toEqual(['Chrome', 'Firefox']);
  });

  it('should move custom build options to testing configuration', async () => {
    const { projects } = tree.readJson('/angular.json') as any;
    projects.app.targets.test.options.assets = ['src/test.assets'];
    tree.overwrite('/angular.json', JSON.stringify({ version: 1, projects }));

    const newTree = await schematicRunner.runSchematic('migrate-karma-to-vitest', {}, tree);
    const { projects: newProjects } = newTree.readJson('/angular.json') as any;

    expect(newProjects.app.targets.build.configurations.testing.assets).toEqual([
      'src/test.assets',
    ]);
    expect(newProjects.app.targets.build.configurations.testing.aot).toBeFalse();
    expect(newProjects.app.targets.build.configurations.testing.optimization).toBeFalse();
    expect(newProjects.app.targets.build.configurations.testing.extractLicenses).toBeFalse();
    expect(newProjects.app.targets.test.options.assets).toBeUndefined();
    expect(newProjects.app.targets.test.options.buildTarget).toBe(':build:testing');
  });

  it('should move custom build options per configuration to testing configurations', async () => {
    const { projects } = tree.readJson('/angular.json') as any;
    projects.app.targets.test.configurations = {
      ci: {
        assets: ['src/ci.assets'],
      },
    };
    tree.overwrite('/angular.json', JSON.stringify({ version: 1, projects }));

    const newTree = await schematicRunner.runSchematic('migrate-karma-to-vitest', {}, tree);
    const { projects: newProjects } = newTree.readJson('/angular.json') as any;

    expect(newProjects.app.targets.build.configurations['testing-ci'].assets).toEqual([
      'src/ci.assets',
    ]);
    expect(newProjects.app.targets.test.configurations.ci.buildTarget).toBe(':build:testing-ci');
    expect(newProjects.app.targets.test.configurations.ci.assets).toBeUndefined();
  });

  it('should omit testing configuration if options match base build options', async () => {
    const { projects } = tree.readJson('/angular.json') as any;
    projects.app.targets.build.options.aot = false;
    projects.app.targets.build.options.optimization = false;
    projects.app.targets.build.options.extractLicenses = false;
    tree.overwrite('/angular.json', JSON.stringify({ version: 1, projects }));

    const newTree = await schematicRunner.runSchematic('migrate-karma-to-vitest', {}, tree);
    const { projects: newProjects } = newTree.readJson('/angular.json') as any;

    expect(newProjects.app.targets.build.configurations?.testing).toBeUndefined();
    expect(newProjects.app.targets.test.options.buildTarget).toBeUndefined();
  });

  it('should skip migration for library projects', async () => {
    const { projects } = tree.readJson('/angular.json') as any;
    projects.app.projectType = 'library';
    tree.overwrite('/angular.json', JSON.stringify({ version: 1, projects }));

    const newTree = await schematicRunner.runSchematic('migrate-karma-to-vitest', {}, tree);
    const { projects: newProjects } = newTree.readJson('/angular.json') as any;

    expect(newProjects.app.targets.test.builder).toBe('@angular/build:karma');
  });

  it('should skip migration if build target is not @angular/build:application', async () => {
    const { projects } = tree.readJson('/angular.json') as any;
    projects.app.targets.build.builder = '@angular-devkit/build-angular:browser';
    tree.overwrite('/angular.json', JSON.stringify({ version: 1, projects }));

    const newTree = await schematicRunner.runSchematic('migrate-karma-to-vitest', {}, tree);
    const { projects: newProjects } = newTree.readJson('/angular.json') as any;

    expect(newProjects.app.targets.test.builder).toBe('@angular/build:karma');
  });

  it('should map reporters from karma config', async () => {
    tree.create(
      'karma.conf.js',
      `
module.exports = function (config) {
  config.set({
    reporters: ['progress', 'dots', 'kjhtml', 'custom'],
  });
};
`,
    );

    const newTree = await schematicRunner.runSchematic('migrate-karma-to-vitest', {}, tree);
    const { projects } = newTree.readJson('/angular.json') as any;

    expect(projects.app.targets.test.options.reporters).toEqual(['default', 'dots']);
  });

  it('should map coverage reporters from karma config', async () => {
    tree.create(
      'karma.conf.js',
      `
module.exports = function (config) {
  config.set({
    coverageReporter: {
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        'lcov'
      ]
    },
  });
};
`,
    );

    const newTree = await schematicRunner.runSchematic('migrate-karma-to-vitest', {}, tree);
    const { projects } = newTree.readJson('/angular.json') as any;

    expect(projects.app.targets.test.options.coverageReporters).toEqual([
      'html',
      'text-summary',
      'lcov',
    ]);
  });

  it('should map coverage thresholds from karma config', async () => {
    tree.create(
      'karma.conf.js',
      `
module.exports = function (config) {
  config.set({
    coverageReporter: {
      check: {
        global: {
          statements: 80,
          branches: 70,
          functions: 60,
          lines: 50
        }
      }
    },
  });
};
`,
    );

    const newTree = await schematicRunner.runSchematic('migrate-karma-to-vitest', {}, tree);
    const { projects } = newTree.readJson('/angular.json') as any;

    expect(projects.app.targets.test.options.coverageThresholds).toEqual({
      statements: 80,
      branches: 70,
      functions: 60,
      lines: 50,
      perFile: false,
    });
  });

  it('should restrict and deduplicate coverage reporters from karma config', async () => {
    tree.create(
      'karma.conf.js',
      `
module.exports = function (config) {
  config.set({
    coverageReporter: {
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'custom' },
        'html',
        'lcov'
      ]
    },
  });
};
`,
    );

    const newTree = await schematicRunner.runSchematic('migrate-karma-to-vitest', {}, tree);
    const { projects } = newTree.readJson('/angular.json') as any;

    expect(projects.app.targets.test.options.coverageReporters).toEqual([
      'html',
      'text-summary',
      'lcov',
    ]);
  });

  it('should add vitest dependency', async () => {
    const newTree = await schematicRunner.runSchematic('migrate-karma-to-vitest', {}, tree);
    const { devDependencies } = newTree.readJson('/package.json') as any;

    expect(devDependencies.vitest).toBe(latestVersions['vitest']);
  });

  it('should delete default karma.conf.js', async () => {
    const { projects } = tree.readJson('/angular.json') as any;
    projects.app.targets.test.builder = '@angular-devkit/build-angular:karma';
    tree.overwrite('/angular.json', JSON.stringify({ version: 1, projects }));

    const DEFAULT_KARMA_CONFIG = `
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {},
    },
    jasmineHtmlReporter: {
      suppressAll: true
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/app'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' }
      ]
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    restartOnFileChange: true
  });
};
`;
    tree.create('karma.conf.js', DEFAULT_KARMA_CONFIG);

    const newTree = await schematicRunner.runSchematic('migrate-karma-to-vitest', {}, tree);
    expect(newTree.exists('karma.conf.js')).toBeFalse();
  });

  it('should shift main compilation entry file directly into setupFiles array', async () => {
    const { projects } = tree.readJson('/angular.json') as any;
    projects.app.targets.test.options.main = 'src/test.ts';
    tree.overwrite('/angular.json', JSON.stringify({ version: 1, projects }));

    const newTree = await schematicRunner.runSchematic('migrate-karma-to-vitest', {}, tree);
    const { projects: newProjects } = newTree.readJson('/angular.json') as any;

    expect(newProjects.app.targets.test.options.setupFiles).toEqual(['src/test.ts']);
    expect(newProjects.app.targets.test.options.main).toBeUndefined();
  });

  it('should generate unique testing configuration name preventing collision overwrites', async () => {
    const { projects } = tree.readJson('/angular.json') as any;
    projects.app.targets.build.configurations = {
      testing: { assets: [] },
      'testing-1': { assets: [] },
    };
    projects.app.targets.test.options.assets = ['src/test.assets'];
    tree.overwrite('/angular.json', JSON.stringify({ version: 1, projects }));

    const newTree = await schematicRunner.runSchematic('migrate-karma-to-vitest', {}, tree);
    const { projects: newProjects } = newTree.readJson('/angular.json') as any;

    expect(newProjects.app.targets.build.configurations['testing-2'].assets).toEqual([
      'src/test.assets',
    ]);
    expect(newProjects.app.targets.test.options.buildTarget).toBe(':build:testing-2');
  });

  it('should inject @vitest/coverage-v8 whenever coverage presence is detected', async () => {
    const { projects } = tree.readJson('/angular.json') as any;
    projects.app.targets.test.options.codeCoverage = true;
    tree.overwrite('/angular.json', JSON.stringify({ version: 1, projects }));

    const newTree = await schematicRunner.runSchematic('migrate-karma-to-vitest', {}, tree);
    const { devDependencies } = newTree.readJson('/package.json') as any;

    expect(devDependencies['@vitest/coverage-v8']).toBe(latestVersions['@vitest/coverage-v8']);
  });

  it('should successfully extract settings across multiple projects sharing the same removable karma config', async () => {
    const { projects } = tree.readJson('/angular.json') as any;
    projects.app.targets.test.builder = '@angular-devkit/build-angular:karma';

    // Add a second project sharing the exact same configuration
    projects.app2 = {
      ...JSON.parse(JSON.stringify(projects.app)),
      root: 'app2',
    };

    tree.overwrite('/angular.json', JSON.stringify({ version: 1, projects }));

    const DEFAULT_KARMA_CONFIG = `
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {},
    },
    jasmineHtmlReporter: {
      suppressAll: true
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/app'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' }
      ]
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    restartOnFileChange: true
  });
};
`;
    tree.create('karma.conf.js', DEFAULT_KARMA_CONFIG);

    const newTree = await schematicRunner.runSchematic('migrate-karma-to-vitest', {}, tree);
    const { projects: newProjects } = newTree.readJson('/angular.json') as any;

    // Assert BOTH projects got the extraction logic mapped correctly
    expect(newProjects.app.targets.test.options.reporters).toEqual(['default']);
    expect(newProjects.app2.targets.test.options.reporters).toEqual(['default']);

    // Assert that the deletion deferred successfully until BOTH extracted the data
    expect(newTree.exists('karma.conf.js')).toBeFalse();
  });
});

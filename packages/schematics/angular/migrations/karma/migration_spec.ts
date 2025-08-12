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

const DEFAULT_KARMA_CONFIG_WITH_DEVKIT = `
// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

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
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution with \`random: false\`
        // or set a specific seed with \`seed: 4321\`
      },
    },
    jasmineHtmlReporter: {
      suppressAll: true // removes the duplicated traces
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/'),
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

const DEFAULT_KARMA_CONFIG_NO_DEVKIT = `
// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage')
    ],
    client: {
      jasmine: {},
    },
    jasmineHtmlReporter: {
      suppressAll: true
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/'),
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

describe('Migration to remove default Karma configuration', () => {
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
          '@angular-devkit/build-angular': latestVersions.DevkitBuildAngular,
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
              test: {
                builder: '@angular-devkit/build-angular:karma',
                options: {
                  karmaConfig: 'karma.conf.js',
                },
              },
            },
          },
        },
      }),
    );
  });

  it('should delete default karma.conf.js and remove karmaConfig option', async () => {
    tree.create('karma.conf.js', DEFAULT_KARMA_CONFIG_WITH_DEVKIT);

    const newTree = await schematicRunner.runSchematic('remove-default-karma-config', {}, tree);
    const { projects } = newTree.readJson('/angular.json') as any;
    expect(projects.app.targets.test.options.karmaConfig).toBeUndefined();
    expect(newTree.exists('karma.conf.js')).toBeFalse();
  });

  it('should not delete modified karma.conf.js', async () => {
    tree.create(
      'karma.conf.js',
      `
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
    ],
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
  });
};
`,
    );

    const newTree = await schematicRunner.runSchematic('remove-default-karma-config', {}, tree);
    const { projects } = newTree.readJson('/angular.json') as any;
    expect(projects.app.targets.test.options.karmaConfig).toBe('karma.conf.js');
    expect(newTree.exists('karma.conf.js')).toBeTrue();
  });

  it('should not delete karma.conf.js with unsupported values', async () => {
    tree.create(
      'karma.conf.js',
      `
const myPlugin = require('my-plugin');
module.exports = function (config) {
  config.set({
    plugins: [myPlugin],
  });
};
`,
    );

    const newTree = await schematicRunner.runSchematic('remove-default-karma-config', {}, tree);
    const { projects } = newTree.readJson('/angular.json') as any;
    expect(projects.app.targets.test.options.karmaConfig).toBe('karma.conf.js');
    expect(newTree.exists('karma.conf.js')).toBeTrue();
  });

  it('should handle multiple projects referencing the same karma.conf.js', async () => {
    let { projects } = tree.readJson('/angular.json') as any;
    projects['app2'] = {
      root: 'app2',
      sourceRoot: 'app2/src',
      projectType: 'application',
      targets: {
        test: {
          builder: '@angular-devkit/build-angular:karma',
          options: {
            karmaConfig: 'karma.conf.js',
          },
        },
      },
    };
    tree.overwrite('/angular.json', JSON.stringify({ version: 1, projects }));
    tree.create('karma.conf.js', DEFAULT_KARMA_CONFIG_WITH_DEVKIT);

    const newTree = await schematicRunner.runSchematic('remove-default-karma-config', {}, tree);
    projects = (newTree.readJson('/angular.json') as any).projects;
    expect(projects.app.targets.test.options.karmaConfig).toBeUndefined();
    expect(projects.app2.targets.test.options.karmaConfig).toBeUndefined();
    expect(newTree.exists('karma.conf.js')).toBeFalse();
  });

  it('should not error for a non-existent karma config file', async () => {
    const { projects } = tree.readJson('/angular.json') as any;
    projects.app.targets.test.options.karmaConfig = 'karma.non-existent.conf.js';
    tree.overwrite('/angular.json', JSON.stringify({ version: 1, projects }));

    const newTree = await schematicRunner.runSchematic('remove-default-karma-config', {}, tree);
    const { projects: newProjects } = newTree.readJson('/angular.json') as any;
    expect(newProjects.app.targets.test.options.karmaConfig).toBe('karma.non-existent.conf.js');
  });

  it('should work for library projects', async () => {
    const { projects } = tree.readJson('/angular.json') as any;
    projects.app.projectType = 'library';
    tree.overwrite('/angular.json', JSON.stringify({ version: 1, projects }));
    tree.create(
      'karma.conf.js',
      // NOTE: The client block is slightly different in this test case.
      `
// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

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
      dir: require('path').join(__dirname, './coverage/'),
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
`,
    );

    const newTree = await schematicRunner.runSchematic('remove-default-karma-config', {}, tree);
    const { projects: newProjects } = newTree.readJson('/angular.json') as any;
    expect(newProjects.app.targets.test.options.karmaConfig).toBeUndefined();
    expect(newTree.exists('karma.conf.js')).toBeFalse();
  });

  it('should handle multiple configurations in the test target', async () => {
    const { projects } = tree.readJson('/angular.json') as any;
    projects.app.targets.test.configurations = {
      ci: {
        karmaConfig: 'karma.ci.conf.js',
      },
    };
    tree.overwrite('/angular.json', JSON.stringify({ version: 1, projects }));
    tree.create(
      'karma.conf.js',
      // NOTE: The client block is slightly different in this test case.
      `
// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

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
      dir: require('path').join(__dirname, './coverage/'),
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
`,
    );
    tree.create(
      'karma.ci.conf.js',
      `
// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    browsers: ['ChromeHeadless'],
  });
};
`,
    );

    const newTree = await schematicRunner.runSchematic('remove-default-karma-config', {}, tree);
    const { projects: newProjects } = newTree.readJson('/angular.json') as any;
    expect(newProjects.app.targets.test.options.karmaConfig).toBeUndefined();
    expect(newProjects.app.targets.test.configurations.ci.karmaConfig).toBe('karma.ci.conf.js');
    expect(newTree.exists('karma.conf.js')).toBeFalse();
    expect(newTree.exists('karma.ci.conf.js')).toBeTrue();
  });

  it('should handle karma config in a subdirectory', async () => {
    const { projects } = tree.readJson('/angular.json') as any;
    projects.app.targets.test.options.karmaConfig = 'src/karma.conf.js';
    tree.overwrite('/angular.json', JSON.stringify({ version: 1, projects }));
    tree.create(
      'src/karma.conf.js',
      `
// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

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
      dir: require('path').join(__dirname, '../coverage/'),
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
`,
    );

    const newTree = await schematicRunner.runSchematic('remove-default-karma-config', {}, tree);
    const { projects: newProjects } = newTree.readJson('/angular.json') as any;
    expect(newProjects.app.targets.test.options.karmaConfig).toBeUndefined();
    expect(newTree.exists('src/karma.conf.js')).toBeFalse();
  });

  it('should not delete almost default karma.conf.js', async () => {
    tree.create(
      'karma.conf.js',
      `
// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

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
      dir: require('path').join(__dirname, './coverage/'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' }
      ]
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    restartOnFileChange: true,
    singleRun: true
  });
};
`,
    );

    const newTree = await schematicRunner.runSchematic('remove-default-karma-config', {}, tree);
    const { projects } = newTree.readJson('/angular.json') as any;
    expect(projects.app.targets.test.options.karmaConfig).toBe('karma.conf.js');
    expect(newTree.exists('karma.conf.js')).toBeTrue();
  });

  it('should delete default karma.conf.js when devkit is not used', async () => {
    tree.overwrite(
      '/package.json',
      JSON.stringify({
        devDependencies: {
          '@angular/build': latestVersions.AngularBuild,
        },
      }),
    );
    const { projects } = tree.readJson('/angular.json') as any;
    projects.app.targets.test.builder = '@angular/build:karma';
    tree.overwrite('/angular.json', JSON.stringify({ version: 1, projects }));
    tree.create('karma.conf.js', DEFAULT_KARMA_CONFIG_NO_DEVKIT);

    const newTree = await schematicRunner.runSchematic('remove-default-karma-config', {}, tree);
    const { projects: newProjects } = newTree.readJson('/angular.json') as any;
    expect(newProjects.app.targets.test.options.karmaConfig).toBeUndefined();
    expect(newTree.exists('karma.conf.js')).toBeFalse();
  });
});

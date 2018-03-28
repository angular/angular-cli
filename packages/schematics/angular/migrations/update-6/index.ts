/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject, Path, join, normalize } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  chain,
} from '@angular-devkit/schematics';
import { AppConfig, CliConfig } from '../../utility/config';
import { latestVersions } from '../../utility/latest-versions';

const defaults = {
  appRoot: 'src',
  index: 'index.html',
  main: 'main.ts',
  polyfills: 'polyfills.ts',
  tsConfig: 'tsconfig.app.json',
  test: 'test.ts',
  outDir: 'dist/',
  karma: 'karma.conf.js',
  protractor: 'protractor.conf.js',
  testTsConfig: 'tsconfig.spec.json',
};

function getConfigPath(tree: Tree): Path {
  let possiblePath = normalize('.angular-cli.json');
  if (tree.exists(possiblePath)) {
    return possiblePath;
  }
  possiblePath = normalize('angular-cli.json');
  if (tree.exists(possiblePath)) {
    return possiblePath;
  }

  throw new SchematicsException('Could not find configuration file');
}

function migrateKarmaConfiguration(config: CliConfig): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info(`Updating karma configuration`);
    try {
      const karmaPath = config && config.test && config.test.karma && config.test.karma.config
        ? config.test.karma.config
        : defaults.karma;
      const buffer = host.read(karmaPath);
      if (buffer !== null) {
        let content = buffer.toString();
        content = content.replace( /@angular\/cli/g, '@angular-devkit/build-angular');
        content = content.replace('reports',
          `dir: require('path').join(__dirname, 'coverage'), reports`);
        host.overwrite(karmaPath, content);
      }
    } catch (e) { }

    return host;
  };
}

function migrateConfiguration(oldConfig: CliConfig): Rule {
  return (host: Tree, context: SchematicContext) => {
    const oldConfigPath = getConfigPath(host);
    const configPath = normalize('angular.json');
    context.logger.info(`Updating configuration`);
    const config: JsonObject = {
      version: 1,
      newProjectRoot: 'projects',
      projects: extractProjectsConfig(oldConfig),
    };
    const cliConfig = extractCliConfig(oldConfig);
    if (cliConfig !== null) {
      config.cli = cliConfig;
    }
    const schematicsConfig = extractSchematicsConfig(oldConfig);
    if (schematicsConfig !== null) {
      config.schematics = schematicsConfig;
    }
    const architectConfig = extractArchitectConfig(oldConfig);
    if (architectConfig !== null) {
      config.architect = architectConfig;
    }

    context.logger.info(`Removing old config file (${oldConfigPath})`);
    host.delete(oldConfigPath);
    context.logger.info(`Writing config file (${configPath})`);
    host.create(configPath, JSON.stringify(config, null, 2));

    return host;
  };
}

function extractCliConfig(_config: CliConfig): JsonObject | null {
  return null;
}

function extractSchematicsConfig(config: CliConfig): JsonObject | null {
  let collectionName = '@schematics/angular';
  if (!config || !config.defaults) {
    return null;
  }
  // const configDefaults = config.defaults;
  if (config.defaults && config.defaults.schematics && config.defaults.schematics.collection) {
    collectionName = config.defaults.schematics.collection;
  }

  /**
   * For each schematic
   *  - get the config
   *  - filter one's without config
   *  - combine them into an object
   */
  // tslint:disable-next-line:no-any
  const schematicConfigs: any = ['class', 'component', 'directive', 'guard',
                                 'interface', 'module', 'pipe', 'service']
    .map(schematicName => {
      // tslint:disable-next-line:no-any
      const schematicDefaults: JsonObject = (config.defaults as any)[schematicName] || null;

      return {
        schematicName,
        config: schematicDefaults,
      };
    })
    .filter(schematic => schematic.config !== null)
    .reduce((all: JsonObject, schematic) => {
      all[collectionName + ':' + schematic.schematicName] = schematic.config;

      return all;
    }, {});

  const componentUpdate: JsonObject = {};
  componentUpdate.prefix = '';

  const componentKey = collectionName + ':component';
  const directiveKey = collectionName + ':directive';
  if (!schematicConfigs[componentKey]) {
    schematicConfigs[componentKey] = {};
  }
  if (!schematicConfigs[directiveKey]) {
    schematicConfigs[directiveKey] = {};
  }
  if (config.apps && config.apps[0]) {
    schematicConfigs[componentKey].prefix = config.apps[0].prefix;
    schematicConfigs[directiveKey].prefix = config.apps[0].prefix;
  }
  if (config.defaults) {
    schematicConfigs[componentKey].styleext = config.defaults.styleExt;
  }

  return schematicConfigs;
}

function extractArchitectConfig(_config: CliConfig): JsonObject | null {
  return null;
}

function extractProjectsConfig(config: CliConfig): JsonObject {
  const builderPackage = '@angular-devkit/build-angular';
  let defaultAppNamePrefix = 'app';
  if (config.project && config.project.name) {
    defaultAppNamePrefix = config.project.name;
  }

  const apps = config.apps || [];
  // convert the apps to projects
  const projectMap = apps
    .map((app: AppConfig, idx: number) => {
      const defaultAppName = idx === 0 ? defaultAppNamePrefix : `${defaultAppNamePrefix}${idx}`;
      const name = app.name || defaultAppName;
      const outDir = app.outDir || defaults.outDir;
      const appRoot = app.root || defaults.appRoot;

      const project: JsonObject = {
        root: '',
        projectType: 'application',
        cli: {},
        schematics: {},
      };

      const extraEntryMapper = (extraEntry: string | JsonObject) => {
        let entry: JsonObject;
        if (typeof extraEntry === 'string') {
          entry = { input: extraEntry };
        } else {
          entry = extraEntry;
        }
        entry.input = join(app.root as Path, <string> entry.input || '');

        return entry;
      };

      const architect: JsonObject = {};
      project.architect = architect;

        // Browser target
      const buildOptions: JsonObject = {
        // Make outputPath relative to root.
        outputPath: outDir,
        index: appRoot + '/' + app.index || defaults.index,
        main: appRoot + '/' + app.main || defaults.main,
        polyfills: appRoot + '/' + app.polyfills || defaults.polyfills,
        tsConfig: appRoot + '/' + app.tsconfig || defaults.tsConfig,
      };

      buildOptions.assets = (app.assets || []).map((asset: string | JsonObject) =>
        typeof asset === 'string'
          ? { glob: appRoot + '/' + asset }
          : appRoot + '/' + asset);
      buildOptions.styles = (app.styles || []).map(extraEntryMapper);
      buildOptions.scripts = (app.scripts || []).map(extraEntryMapper);
      architect.build = {
        builder: `${builderPackage}:browser`,
        options: buildOptions,
        configurations: {
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
        },
      };

      // Serve target
      const serveOptions: JsonObject = {
        browserTarget: `${name}:build`,
      };
      architect.serve = {
        builder: `${builderPackage}:dev-server`,
        options: serveOptions,
        configurations: {
          production: {
            browserTarget: `${name}:build`,
          },
        },
      };

      // Extract target
      const extractI18nOptions: JsonObject = { browserTarget: `${name}:build` };
      architect['extract-i18n'] = {
        builder: `${builderPackage}:extract-i18n`,
        options: extractI18nOptions,
      };

      const karmaConfig = config.test && config.test.karma
          ? config.test.karma.config || ''
          : '';
        // Test target
      const testOptions: JsonObject = {
          main: appRoot + '/' + app.test || defaults.test,
          polyfills: appRoot + '/' + app.polyfills || defaults.polyfills,
          // Make karmaConfig relative to root.
          karmaConfig,
        };
      if (app.testTsconfig) {
          testOptions.tsConfig = appRoot + '/' + app.testTsconfig;
        }
      testOptions.scripts = (app.scripts || []).map(extraEntryMapper);
      testOptions.styles = (app.styles || []).map(extraEntryMapper);
      testOptions.assets = (app.assets || []).map((asset: string | JsonObject) =>
          typeof asset === 'string'
          ? { glob: appRoot + '/' + asset }
          : appRoot + '/' + asset);

      if (karmaConfig) {
        architect.test = {
          builder: `${builderPackage}:karma`,
          options: testOptions,
        };
      }

      const tsConfigs: string[] = [];
      const excludes: string[] = [];
      if (config && config.lint && Array.isArray(config.lint)) {
        config.lint.forEach(lint => {
          tsConfigs.push(lint.project);
          if (lint.exclude) {
            if (typeof lint.exclude === 'string') {
              excludes.push(lint.exclude);
            } else {
              lint.exclude.forEach(ex => excludes.push(ex));
            }
          }
        });
      }

      const removeDupes = (items: string[]) => items.reduce((newItems, item) => {
        if (newItems.indexOf(item) === -1) {
          newItems.push(item);
        }

        return newItems;
      }, <string[]> []);

        // Tslint target
      const lintOptions: JsonObject = {
        tsConfig: removeDupes(tsConfigs).filter(t => t.indexOf('e2e') === -1),
        exclude: removeDupes(excludes),
      };
      architect.lint = {
          builder: `${builderPackage}:tslint`,
          options: lintOptions,
        };

      const e2eProject: JsonObject = {
        root: project.root,
        projectType: 'application',
        cli: {},
        schematics: {},
      };

      const e2eArchitect: JsonObject = {};

      // tslint:disable-next-line:max-line-length
      const protractorConfig = config && config.e2e && config.e2e.protractor && config.e2e.protractor.config
        ? config.e2e.protractor.config
        : '';
      const e2eOptions: JsonObject = {
        protractorConfig: protractorConfig,
        devServerTarget: `${name}:serve`,
      };
      const e2eTarget: JsonObject = {
        builder: `${builderPackage}:protractor`,
        options: e2eOptions,
      };

      e2eArchitect.e2e = e2eTarget;
      const e2eLintOptions: JsonObject = {
        tsConfig: removeDupes(tsConfigs).filter(t => t.indexOf('e2e') !== -1),
        exclude: removeDupes(excludes),
      };
      const e2eLintTarget: JsonObject = {
        builder: `${builderPackage}:tslint`,
        options: e2eLintOptions,
      };
      e2eArchitect.lint = e2eLintTarget;
      if (protractorConfig) {
        e2eProject.architect = e2eArchitect;
      }

      return { name, project, e2eProject };
    })
    .reduce((projects, mappedApp) => {
      const {name, project, e2eProject} = mappedApp;
      projects[name] = project;
      projects[name + '-e2e'] = e2eProject;

      return projects;
    }, {} as JsonObject);

  return projectMap;
}

function updateSpecTsConfig(config: CliConfig): Rule {
  return (host: Tree, context: SchematicContext) => {
    const apps = config.apps || [];
    apps.forEach((app: AppConfig, idx: number) => {
      const tsSpecConfigPath =
        join(app.root as Path, app.testTsconfig || defaults.testTsConfig);
      const buffer = host.read(tsSpecConfigPath);
      if (!buffer) {
        return;
      }
      const tsCfg = JSON.parse(buffer.toString());
      if (!tsCfg.files) {
        tsCfg.files = [];
      }

      // Ensure the spec tsconfig contains the polyfills file
      if (tsCfg.files.indexOf(app.polyfills || defaults.polyfills) === -1) {
        tsCfg.files.push(app.polyfills || defaults.polyfills);
        host.overwrite(tsSpecConfigPath, JSON.stringify(tsCfg, null, 2));
      }
    });
  };
}

function updatePackageJson() {
  return (host: Tree, context: SchematicContext) => {
    const pkgPath = '/package.json';
    const buffer = host.read(pkgPath);
    if (buffer == null) {
      throw new SchematicsException('Could not read package.json');
    }
    const content = buffer.toString();
    const pkg = JSON.parse(content);

    if (pkg === null || typeof pkg !== 'object' || Array.isArray(pkg)) {
      throw new SchematicsException('Error reading package.json');
    }
    if (!pkg.devDependencies) {
      pkg.devDependencies = {};
    }

    pkg.devDependencies['@angular-devkit/build-angular'] = latestVersions.DevkitBuildWebpack;

    host.overwrite(pkgPath, JSON.stringify(pkg, null, 2));

    return host;
  };
}

export default function (): Rule {
  return (host: Tree, context: SchematicContext) => {
    const configPath = getConfigPath(host);
    const configBuffer = host.read(normalize(configPath));
    if (configBuffer == null) {
      throw new SchematicsException(`Could not find configuration file (${configPath})`);
    }
    const config = JSON.parse(configBuffer.toString());

    return chain([
      migrateKarmaConfiguration(config),
      migrateConfiguration(config),
      updateSpecTsConfig(config),
      updatePackageJson(),
    ])(host, context);
  };
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  JsonArray,
  JsonObject,
  Path,
  join,
  logging,
  normalize,
  tags,
} from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  chain,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { parse as parseJson } from 'jsonc-parser';
import {
  NodeDependency,
  NodeDependencyType,
  addPackageJsonDependency,
} from '../../utility/dependencies';
import { JSONFile } from '../../utility/json-file';
import { latestVersions } from '../../utility/latest-versions';
import { AppConfig, CliConfig } from './config';

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
  serverOutDir: 'dist-server',
  serverMain: 'main.server.ts',
  serverTsConfig: 'tsconfig.server.json',
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
        // Replace the 1.0 files and preprocessor entries, with and without comma at the end.
        // If these remain, they will cause the `ng test` to fail.
        content = content.replace(`{ pattern: './src/test.ts', watched: false },`, '');
        content = content.replace(`{ pattern: './src/test.ts', watched: false }`, '');
        content = content.replace(`'./src/test.ts': ['@angular/cli'],`, '');
        content = content.replace(`'./src/test.ts': ['@angular/cli']`, '');
        content = content.replace(/angularCli[^}]*},?/, '');
        // Replace 1.x plugin names.
        content = content.replace(/@angular\/cli/g, '@angular-devkit/build-angular');
        // Replace code coverage output path.
        content = content.replace('reports',
          `dir: require('path').join(__dirname, 'coverage'), reports`);
        host.overwrite(karmaPath, content);
      }
    } catch { }

    return host;
  };
}

function migrateConfiguration(oldConfig: CliConfig, logger: logging.LoggerApi): Rule {
  return (host: Tree, context: SchematicContext) => {
    const oldConfigPath = getConfigPath(host);
    const configPath = normalize('angular.json');
    context.logger.info(`Updating configuration`);
    const config: JsonObject = {
      '$schema': './node_modules/@angular/cli/lib/config/schema.json',
      version: 1,
      newProjectRoot: 'projects',
      projects: extractProjectsConfig(oldConfig, host, logger),
    };
    const defaultProject = extractDefaultProject(oldConfig);
    if (defaultProject !== null) {
      config.defaultProject = defaultProject;
    }
    const cliConfig = extractCliConfig(oldConfig);
    if (cliConfig !== null) {
      config.cli = cliConfig;
    }
    const schematicsConfig = extractSchematicsConfig(oldConfig);
    if (schematicsConfig !== null) {
      config.schematics = schematicsConfig;
    }
    const targetsConfig = extractTargetsConfig(oldConfig);
    if (targetsConfig !== null) {
      config.architect = targetsConfig;
    }

    context.logger.info(`Removing old config file (${oldConfigPath})`);
    host.delete(oldConfigPath);
    context.logger.info(`Writing config file (${configPath})`);
    host.create(configPath, JSON.stringify(config, null, 2));

    return host;
  };
}

function extractCliConfig(config: CliConfig): JsonObject | null {
  const newConfig: JsonObject = {};
  if (config.packageManager && config.packageManager !== 'default') {
    newConfig['packageManager'] = config.packageManager;
  }
  if (config.warnings) {
    if (config.warnings.versionMismatch !== undefined) {
      newConfig.warnings = {
        ...((newConfig.warnings as JsonObject | null) || {}),
        ...{ versionMismatch: config.warnings.versionMismatch },
      };
    }
  }

  return Object.getOwnPropertyNames(newConfig).length == 0 ? null : newConfig;
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

function extractTargetsConfig(_config: CliConfig): JsonObject | null {
  return null;
}

// This function is too big, but also really hard to refactor properly as the whole config
// depends on all parts of the config.
// tslint:disable-next-line:no-big-function
function extractProjectsConfig(
  config: CliConfig, tree: Tree, logger: logging.LoggerApi,
): JsonObject {
  const builderPackage = '@angular-devkit/build-angular';
  const defaultAppNamePrefix = getDefaultAppNamePrefix(config);

  const buildDefaults: JsonObject = config.defaults && config.defaults.build
    ? {
      sourceMap: config.defaults.build.sourcemaps,
      progress: config.defaults.build.progress,
      poll: config.defaults.build.poll,
      deleteOutputPath: config.defaults.build.deleteOutputPath,
      preserveSymlinks: config.defaults.build.preserveSymlinks,
      showCircularDependencies: config.defaults.build.showCircularDependencies,
      commonChunk: config.defaults.build.commonChunk,
      namedChunks: config.defaults.build.namedChunks,
    } as JsonObject
    : {};

  const serveDefaults: JsonObject = config.defaults && config.defaults.serve
    ? {
      port: config.defaults.serve.port,
      host: config.defaults.serve.host,
      ssl: config.defaults.serve.ssl,
      sslKey: config.defaults.serve.sslKey,
      sslCert: config.defaults.serve.sslCert,
      proxyConfig: config.defaults.serve.proxyConfig,
    } as JsonObject
    : {};


  const apps = config.apps || [];
  // convert the apps to projects
  const browserApps = apps.filter(app => app.platform !== 'server');
  const serverApps = apps.filter(app => app.platform === 'server');

  const projectMap = browserApps
    // This function is too big, but also really hard to refactor properly as the whole config
    // depends on all parts of the config.
    // tslint:disable-next-line:no-big-function
    .map((app, idx) => {
      const defaultAppName = idx === 0 ? defaultAppNamePrefix : `${defaultAppNamePrefix}${idx}`;
      const name = app.name || defaultAppName;
      const outDir = app.outDir || defaults.outDir;
      const appRoot = app.root || defaults.appRoot;

      function _mapAssets(asset: string | { glob?: string; input?: string; output?: string; allowOutsideOutDir?: boolean}) {
        if (typeof asset === 'string') {
          return normalize(appRoot + '/' + asset);
        } else {
          if (asset.allowOutsideOutDir) {
            logger.warn(tags.oneLine`
              Asset with input '${asset.input}' was not migrated because it
              uses the 'allowOutsideOutDir' option which is not supported in Angular CLI 6.
            `);

            return null;
          } else if (!asset.glob) {
            logger.warn(tags.oneLine`
              Asset with input '${asset.input}' was not migrated because it
              does not contain a glob property.
            `);

            return null;
          } else if (asset.output) {
            return {
              glob: asset.glob,
              input: normalize(appRoot + '/' + asset.input),
              output: normalize('/' + asset.output as string),
            };
          } else {
            return {
              glob: asset.glob,
              input: normalize(appRoot + '/' + asset.input),
              output: '/',
            };
          }
        }
      }

      function _buildConfigurations(): JsonObject {
        const source = app.environmentSource;
        const environments = app.environments;
        const serviceWorker = app.serviceWorker;

        const productionPartial = {
          optimization: true,
          outputHashing: 'all',
          sourceMap: false,
          extractCss: true,
          namedChunks: false,
          aot: true,
          extractLicenses: true,
          vendorChunk: false,
          buildOptimizer: true,
          ...(serviceWorker ? {serviceWorker: true, ngswConfigPath: 'src/ngsw-config.json'} : {}),
          ...(app.budgets ? { budgets: app.budgets as JsonArray} : {}),
        };

        if (!environments) {
          return { production: productionPartial };
        }

        const configurations = Object.keys(environments).reduce((acc, environment) => {
          if (source === environments[environment]) {
            return acc;
          }

          let isProduction = false;

          const environmentContent = tree.read(app.root + '/' + environments[environment]);
          if (environmentContent) {
            isProduction = !!environmentContent.toString('utf-8')
              // Allow for `production: true` or `production = true`. Best we can do to guess.
              .match(/production['"]?\s*[:=]\s*true/);
          }

          let configurationName;
          // We used to use `prod` by default as the key, instead we now use the full word.
          // Try not to override the production key if it's there.
          if (environment == 'prod' && !environments['production'] && isProduction) {
            configurationName = 'production';
          } else {
            configurationName = environment;
          }

          acc[configurationName] = {
            ...(isProduction ? productionPartial : {}),
            fileReplacements: [
              {
                replace: `${app.root}/${source}`,
                with: `${app.root}/${environments[environment]}`,
              },
            ],
          };

          return acc;
        }, {} as JsonObject);

        if (!configurations['production']) {
          configurations['production'] = { ...productionPartial };
        }

        return configurations;
      }

      function _serveConfigurations(): JsonObject {
        const environments = app.environments;

        if (!environments) {
          return {};
        }
        if (!targets) {
          throw new Error();
        }

        const configurations = (targets.build as JsonObject).configurations as JsonObject;

        return Object.keys(configurations).reduce((acc, environment) => {
          acc[environment] = { browserTarget: `${name}:build:${environment}` };

          return acc;
        }, {} as JsonObject);
      }

      function _extraEntryMapper(extraEntry: string | JsonObject) {
        let entry: string | JsonObject;
        if (typeof extraEntry === 'string') {
          entry = join(app.root as Path, extraEntry);
        } else {
          const input = join(app.root as Path, extraEntry.input as string || '');
          entry = { input, lazy: extraEntry.lazy };

          if (extraEntry.output) {
            entry.bundleName = extraEntry.output;
          }
        }

        return entry;
      }

      const projectRoot = join(normalize(appRoot), '..');
      const project: JsonObject = {
        root: projectRoot,
        sourceRoot: appRoot,
        projectType: 'application',
      };

      const targets: JsonObject = {};
      project.architect = targets;

        // Browser target
      const buildOptions: JsonObject = {
        // Make outputPath relative to root.
        outputPath: outDir,
        index: `${appRoot}/${app.index || defaults.index}`,
        main: `${appRoot}/${app.main || defaults.main}`,
        tsConfig: `${appRoot}/${app.tsconfig || defaults.tsConfig}`,
        ...(app.baseHref ? { baseHref: app.baseHref } : {}),
        ...buildDefaults,
      };

      if (app.polyfills) {
        buildOptions.polyfills = appRoot + '/' + app.polyfills;
      }

      if (app.stylePreprocessorOptions
          && app.stylePreprocessorOptions.includePaths
          && Array.isArray(app.stylePreprocessorOptions.includePaths)
          && app.stylePreprocessorOptions.includePaths.length > 0) {
        buildOptions.stylePreprocessorOptions = {
          includePaths: app.stylePreprocessorOptions.includePaths
            .map(includePath => join(app.root as Path, includePath)),
        };
      }

      buildOptions.assets = (app.assets || []).map(_mapAssets).filter(x => !!x);
      buildOptions.styles = (app.styles || []).map(_extraEntryMapper);
      buildOptions.scripts = (app.scripts || []).map(_extraEntryMapper);
      targets.build = {
        builder: `${builderPackage}:browser`,
        options: buildOptions,
        configurations: _buildConfigurations(),
      };

      // Serve target
      const serveOptions: JsonObject = {
        browserTarget: `${name}:build`,
        ...serveDefaults,
      };
      targets.serve = {
        builder: `${builderPackage}:dev-server`,
        options: serveOptions,
        configurations: _serveConfigurations(),
      };

      // Extract target
      const extractI18nOptions: JsonObject = { browserTarget: `${name}:build` };
      targets['extract-i18n'] = {
        builder: `${builderPackage}:extract-i18n`,
        options: extractI18nOptions,
      };

      const karmaConfig = config.test && config.test.karma
          ? config.test.karma.config || ''
          : '';
        // Test target
      const testOptions: JsonObject = {
          main: appRoot + '/' + app.test || defaults.test,
          // Make karmaConfig relative to root.
          karmaConfig,
        };

      if (app.polyfills) {
        testOptions.polyfills = appRoot + '/' + app.polyfills;
      }

      if (app.testTsconfig) {
          testOptions.tsConfig = appRoot + '/' + app.testTsconfig;
      }

      const codeCoverageExclude = config.test
        && config.test.codeCoverage
        && config.test.codeCoverage.exclude;

      if (codeCoverageExclude) {
        testOptions.codeCoverageExclude = codeCoverageExclude;
      }

      testOptions.scripts = (app.scripts || []).map(_extraEntryMapper);
      testOptions.styles = (app.styles || []).map(_extraEntryMapper);
      testOptions.assets = (app.assets || []).map(_mapAssets).filter(x => !!x);

      if (karmaConfig) {
        targets.test = {
          builder: `${builderPackage}:karma`,
          options: testOptions,
        };
      }

      const tsConfigs: string[] = [];
      const excludes: string[] = [];
      let warnForLint = false;
      if (config && config.lint && Array.isArray(config.lint)) {
        config.lint.forEach(lint => {
          if (lint.project) {
            tsConfigs.push(lint.project);
          } else {
            warnForLint = true;
          }

          if (lint.exclude) {
            if (typeof lint.exclude === 'string') {
              excludes.push(lint.exclude);
            } else {
              lint.exclude.forEach(ex => excludes.push(ex));
            }
          }
        });
      }

      if (warnForLint) {
        logger.warn(`
          Lint without 'project' was not migrated which is not supported in Angular CLI 6.
        `);
      }

      const removeDupes = (items: string[]) => items.reduce((newItems, item) => {
        if (newItems.indexOf(item) === -1) {
          newItems.push(item);
        }

        return newItems;
      }, [] as string[]);

        // Tslint target
      const lintOptions: JsonObject = {
        tsConfig: removeDupes(tsConfigs).filter(t => t.indexOf('e2e') === -1),
        exclude: removeDupes(excludes),
      };
      targets.lint = {
          builder: `${builderPackage}:tslint`,
          options: lintOptions,
        };

      // server target
      const serverApp = serverApps
        .filter(serverApp => app.root === serverApp.root && app.index === serverApp.index)[0];

      if (serverApp) {
        const serverOptions: JsonObject = {
          outputPath: serverApp.outDir || defaults.serverOutDir,
          main: `${appRoot}/${serverApp.main || defaults.serverMain}`,
          tsConfig: `${appRoot}/${serverApp.tsconfig || defaults.serverTsConfig}`,
        };
        const serverTarget: JsonObject = {
          builder: '@angular-devkit/build-angular:server',
          options: serverOptions,
        };
        targets.server = serverTarget;
      }
      const e2eProject: JsonObject = {
        root: join(projectRoot, 'e2e'),
        sourceRoot: join(projectRoot, 'e2e'),
        projectType: 'application',
      };

      const e2eTargets: JsonObject = {};

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

      e2eTargets.e2e = e2eTarget;
      const e2eLintOptions: JsonObject = {
        tsConfig: removeDupes(tsConfigs).filter(t => t.indexOf('e2e') !== -1),
        exclude: removeDupes(excludes),
      };
      const e2eLintTarget: JsonObject = {
        builder: `${builderPackage}:tslint`,
        options: e2eLintOptions,
      };
      e2eTargets.lint = e2eLintTarget;
      if (protractorConfig) {
        e2eProject.architect = e2eTargets;
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

function getDefaultAppNamePrefix(config: CliConfig) {
  let defaultAppNamePrefix = 'app';
  if (config.project && config.project.name) {
    defaultAppNamePrefix = config.project.name;
  }

  return defaultAppNamePrefix;
}

function extractDefaultProject(config: CliConfig): string | null {
  if (config.apps && config.apps[0]) {
    const app = config.apps[0];
    const defaultAppName = getDefaultAppNamePrefix(config);
    const name = app.name || defaultAppName;

    return name;
  }

  return null;
}

function updateSpecTsConfig(config: CliConfig): Rule {
  return (host) => {
    const apps = config.apps || [];
    apps.forEach((app: AppConfig) => {
      const testTsConfig = app.testTsconfig || defaults.testTsConfig;
      const tsSpecConfigPath = join(normalize(app.root || ''), testTsConfig);

      let tsConfigJson;
      try {
        tsConfigJson = new JSONFile(host, tsSpecConfigPath);
      } catch {
        return;
      }

      const files = tsConfigJson.get(['files']);
      if (files === undefined) {
        // Do nothing if the files array does not exist. This means exclude or include are
        // set and we shouldn't mess with that.
        return;
      }

      if (!Array.isArray(files)) {
        throw new SchematicsException('Invalid tsconfig "files" property; expected an array.');
      }

      const polyfills = app.polyfills || defaults.polyfills;
      if (polyfills && !files.includes(polyfills)) {
        // Append polyfills file to the files array
        tsConfigJson.modify(['files', -1], polyfills);
      }
    });
  };
}

function updatePackageJson(config: CliConfig) {
  return (host: Tree, context: SchematicContext) => {
    const dependency: NodeDependency = {
      type: NodeDependencyType.Dev,
      name: '@angular-devkit/build-angular',
      version: latestVersions.DevkitBuildAngular,
      overwrite: true,
    };
    addPackageJsonDependency(host, dependency);

    context.addTask(new NodePackageInstallTask({
      packageManager: config.packageManager === 'default' ? undefined : config.packageManager,
    }));

    return host;
  };
}

function updateTsLintConfig(): Rule {
  return (host) => {
    const tsLintPath = '/tslint.json';

    let tsLintJson;
    try {
      tsLintJson = new JSONFile(host, tsLintPath);
    } catch {
      return;
    }

    const rulePath = ['rules', 'import-blacklist'];
    const currentRuleItems = tsLintJson.get(rulePath);
    if (!currentRuleItems || !Array.isArray(currentRuleItems)) {
      return;
    }

    // Remove all occurences of rxjs
    const newRuleItems = currentRuleItems.filter(value => value !== 'rxjs');
    tsLintJson.modify(rulePath, newRuleItems);
  };
}

function updateRootTsConfig(): Rule {
  return (host: Tree, context: SchematicContext) => {
    const tsConfigPath = '/tsconfig.json';

    let tsConfigJson;
    try {
      tsConfigJson = new JSONFile(host, tsConfigPath);
    } catch {
      return;
    }

    const baseUrlPath = ['compilerOptions', 'baseUrl'];
    const baseUrl = tsConfigJson.get(baseUrlPath);
    if (baseUrl === undefined || typeof baseUrl !== 'string') {
      tsConfigJson.modify(baseUrlPath, './');
    } else {
      const validBaseUrl = ['./', '', '.'];
      if (!validBaseUrl.includes(baseUrl)) {
        const formattedBaseUrl = validBaseUrl.map(x => `'${x}'`).join(', ');
        context.logger.warn(tags.oneLine
          `Root tsconfig option 'baseUrl' is not one of: ${formattedBaseUrl}.
          This might cause unexpected behaviour when generating libraries.`,
        );
      }
    }

    const modulePath = ['compilerOptions', 'module'];
    const module = tsConfigJson.get(modulePath);
    if (module === undefined || typeof module !== 'string') {
      tsConfigJson.modify(modulePath, 'es2015');
    } else if (module.toLowerCase() !== 'es2015') {
      context.logger.warn(
        `Root tsconfig option 'module' is not 'es2015'. This might cause unexpected behaviour.`,
      );
    }
  };
}

export default function (): Rule {
  return (host: Tree, context: SchematicContext) => {
    if (host.exists('/.angular.json') || host.exists('/angular.json')) {
      context.logger.info('Found a modern configuration file. Nothing to be done.');

      return host;
    }

    const configPath = getConfigPath(host);
    const configBuffer = host.read(normalize(configPath));
    if (configBuffer == null) {
      throw new SchematicsException(`Could not find configuration file (${configPath})`);
    }
    const config = parseJson(configBuffer.toString());

    if (typeof config != 'object' || Array.isArray(config) || config === null) {
      throw new SchematicsException('Invalid angular-cli.json configuration; expected an object.');
    }

    return chain([
      migrateKarmaConfiguration(config),
      migrateConfiguration(config, context.logger),
      updateSpecTsConfig(config),
      updatePackageJson(config),
      updateRootTsConfig(),
      updateTsLintConfig(),
      (host: Tree, context: SchematicContext) => {
        context.logger.warn(tags.oneLine`Some configuration options have been changed,
          please make sure to update any npm scripts which you may have modified.`);

        return host;
      },
    ]);
  };
}

import * as fs from 'fs';
import { fork, ChildProcess } from 'child_process';
import * as path from 'path';
import * as ts from 'typescript';

const ContextElementDependency = require('webpack/lib/dependencies/ContextElementDependency');
const NodeWatchFileSystem = require('webpack/lib/node/NodeWatchFileSystem');
const treeKill = require('tree-kill');

import { WebpackResourceLoader } from './resource_loader';
import { WebpackCompilerHost } from './compiler_host';
import { Tapable } from './webpack';
import { PathsPlugin } from './paths-plugin';
import { findLazyRoutes, LazyRouteMap } from './lazy_routes';
import { VirtualFileSystemDecorator } from './virtual_file_system_decorator';
import { resolveEntryModuleFromMain } from './entry_resolver';
import {
  TransformOperation,
  makeTransform,
  replaceBootstrap,
  exportNgFactory,
  exportLazyModuleMap,
  registerLocaleData,
  replaceResources,
} from './transformers';
import { time, timeEnd } from './benchmark';
import { InitMessage, UpdateMessage } from './type_checker';
import { gatherDiagnostics, hasErrors } from './gather_diagnostics';
import {
  CompilerCliIsSupported,
  __NGTOOLS_PRIVATE_API_2,
  VERSION,
  DEFAULT_ERROR_CODE,
  UNKNOWN_ERROR_CODE,
  SOURCE,
  Program,
  CompilerOptions,
  CompilerHost,
  Diagnostics,
  CustomTransformers,
  createProgram,
  createCompilerHost,
  formatDiagnostics,
  EmitFlags,
} from './ngtools_api';


/**
 * Option Constants
 */
export interface AngularCompilerPluginOptions {
  sourceMap?: boolean;
  tsConfigPath: string;
  basePath?: string;
  entryModule?: string;
  mainPath?: string;
  skipCodeGeneration?: boolean;
  hostOverrideFileSystem?: { [path: string]: string };
  hostReplacementPaths?: { [path: string]: string };
  i18nInFile?: string;
  i18nInFormat?: string;
  i18nOutFile?: string;
  i18nOutFormat?: string;
  locale?: string;
  missingTranslation?: string;
  platform?: PLATFORM;

  // Use tsconfig to include path globs.
  exclude?: string | string[];
  include?: string[];
  compilerOptions?: ts.CompilerOptions;
}

export enum PLATFORM {
  Browser,
  Server
}

export class AngularCompilerPlugin implements Tapable {
  private _options: AngularCompilerPluginOptions;

  // TS compilation.
  private _compilerOptions: ts.CompilerOptions;
  private _angularCompilerOptions: CompilerOptions;
  private _tsFilenames: string[];
  private _program: ts.Program | Program;
  private _compilerHost: WebpackCompilerHost;
  private _angularCompilerHost: WebpackCompilerHost & CompilerHost;
  // Contains `moduleImportPath#exportName` => `fullModulePath`.
  private _lazyRoutes: LazyRouteMap = Object.create(null);
  private _tsConfigPath: string;
  private _entryModule: string;
  private _basePath: string;
  private _transformMap: Map<string, TransformOperation[]> = new Map();
  private _platform: PLATFORM;
  private _JitMode = false;

  // Webpack plugin.
  private _firstRun = true;
  private _donePromise: Promise<void> | null;
  private _compiler: any = null;
  private _compilation: any = null;
  private _failedCompilation = false;

  // TypeChecker process.
  private _forkTypeChecker = true;
  private _typeCheckerProcess: ChildProcess;

  constructor(options: AngularCompilerPluginOptions) {
    CompilerCliIsSupported();
    this._options = Object.assign({}, options);
    this._setupOptions(this._options);
  }

  get options() { return this._options; }
  get done() { return this._donePromise; }
  get failedCompilation() { return this._failedCompilation; }
  get entryModule() {
    const splitted = this._entryModule.split('#');
    const path = splitted[0];
    const className = splitted[1] || 'default';
    return { path, className };
  }

  static isSupported() {
    return VERSION && parseInt(VERSION.major) >= 5;
  }

  private _setupOptions(options: AngularCompilerPluginOptions) {
    time('AngularCompilerPlugin._setupOptions');
    // Fill in the missing options.
    if (!options.hasOwnProperty('tsConfigPath')) {
      throw new Error('Must specify "tsConfigPath" in the configuration of @ngtools/webpack.');
    }
    // TS represents paths internally with '/' and expects the tsconfig path to be in this format
    this._tsConfigPath = options.tsConfigPath.replace(/\\/g, '/');

    // Check the base path.
    const maybeBasePath = path.resolve(process.cwd(), this._tsConfigPath);
    let basePath = maybeBasePath;
    if (fs.statSync(maybeBasePath).isFile()) {
      basePath = path.dirname(basePath);
    }
    if (options.hasOwnProperty('basePath')) {
      basePath = path.resolve(process.cwd(), options.basePath);
    }

    this._basePath = basePath;

    // Read the tsconfig.
    const configResult = ts.readConfigFile(this._tsConfigPath, ts.sys.readFile);
    if (configResult.error) {
      const diagnostic = configResult.error;
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

      if (diagnostic.file) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        throw new Error(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message})`);
      } else {
        throw new Error(message);
      }
    }

    const tsConfigJson = configResult.config;

    // Extend compilerOptions.
    if (options.hasOwnProperty('compilerOptions')) {
      tsConfigJson.compilerOptions = Object.assign({},
        tsConfigJson.compilerOptions,
        options.compilerOptions
      );
    }

    // Default exclude to **/*.spec.ts files.
    if (!options.hasOwnProperty('exclude')) {
      options['exclude'] = ['**/*.spec.ts'];
    }

    // Add custom excludes to default TypeScript excludes.
    if (options.hasOwnProperty('exclude')) {
      // If the tsconfig doesn't contain any excludes, we must add the default ones before adding
      // any extra ones (otherwise we'd include all of these which can cause unexpected errors).
      // This is the same logic as present in TypeScript.
      if (!tsConfigJson.exclude) {
        tsConfigJson['exclude'] = ['node_modules', 'bower_components', 'jspm_packages'];
        if (tsConfigJson.compilerOptions && tsConfigJson.compilerOptions.outDir) {
          tsConfigJson.exclude.push(tsConfigJson.compilerOptions.outDir);
        }
      }

      // Join our custom excludes with the existing ones.
      tsConfigJson.exclude = tsConfigJson.exclude.concat(options.exclude);
    }

    // Parse the tsconfig contents.
    const tsConfig = ts.parseJsonConfigFileContent(
      tsConfigJson, ts.sys, basePath, undefined, this._tsConfigPath);

    this._tsFilenames = tsConfig.fileNames;
    this._compilerOptions = tsConfig.options;

    // Overwrite outDir so we can find generated files next to their .ts origin in compilerHost.
    this._compilerOptions.outDir = '';

    // Default plugin sourceMap to compiler options setting.
    if (!options.hasOwnProperty('sourceMap')) {
      options.sourceMap = this._compilerOptions.sourceMap || false;
    }

    // Force the right sourcemap options.
    if (options.sourceMap) {
      this._compilerOptions.sourceMap = true;
      this._compilerOptions.inlineSources = true;
      this._compilerOptions.inlineSourceMap = false;
      this._compilerOptions.sourceRoot = basePath;
    } else {
      this._compilerOptions.sourceMap = false;
      this._compilerOptions.sourceRoot = undefined;
      this._compilerOptions.inlineSources = undefined;
      this._compilerOptions.inlineSourceMap = undefined;
      this._compilerOptions.mapRoot = undefined;
    }

    // Compose Angular Compiler Options.
    this._angularCompilerOptions = Object.assign(
      this._compilerOptions,
      tsConfig.raw['angularCompilerOptions'],
      { basePath }
    );

    // Set JIT (no code generation) or AOT mode.
    if (options.skipCodeGeneration !== undefined) {
      this._JitMode = options.skipCodeGeneration;
    }

    // Process i18n options.
    if (options.hasOwnProperty('i18nInFile')) {
      this._angularCompilerOptions.i18nInFile = options.i18nInFile;
    }
    if (options.hasOwnProperty('i18nInFormat')) {
      this._angularCompilerOptions.i18nInFormat = options.i18nInFormat;
    }
    if (options.hasOwnProperty('i18nOutFile')) {
      this._angularCompilerOptions.i18nOutFile = options.i18nOutFile;
    }
    if (options.hasOwnProperty('i18nOutFormat')) {
      this._angularCompilerOptions.i18nOutFormat = options.i18nOutFormat;
    }
    if (options.hasOwnProperty('locale') && options.locale) {
      this._angularCompilerOptions.i18nInLocale = this._validateLocale(options.locale);
    }
    if (options.hasOwnProperty('missingTranslation')) {
      this._angularCompilerOptions.i18nInMissingTranslations =
        options.missingTranslation as 'error' | 'warning' | 'ignore';
    }

    // Use entryModule if available in options, otherwise resolve it from mainPath after program
    // creation.
    if (this._options.entryModule) {
      this._entryModule = this._options.entryModule;
    } else if (this._angularCompilerOptions.entryModule) {
      this._entryModule = path.resolve(this._basePath,
        this._angularCompilerOptions.entryModule);
    }

    // Create the webpack compiler host.
    this._compilerHost = new WebpackCompilerHost(this._compilerOptions, this._basePath);
    this._compilerHost.enableCaching();

    // Override some files in the FileSystem.
    if (this._options.hostOverrideFileSystem) {
      for (const filePath of Object.keys(this._options.hostOverrideFileSystem)) {
        this._compilerHost.writeFile(filePath,
          this._options.hostOverrideFileSystem[filePath], false);
      }
    }
    // Override some files in the FileSystem with paths from the actual file system.
    if (this._options.hostReplacementPaths) {
      for (const filePath of Object.keys(this._options.hostReplacementPaths)) {
        const replacementFilePath = this._options.hostReplacementPaths[filePath];
        const content = this._compilerHost.readFile(replacementFilePath);
        this._compilerHost.writeFile(filePath, content, false);
      }
    }

    this._platform = options.platform || PLATFORM.Browser;
    timeEnd('AngularCompilerPlugin._setupOptions');
  }

  private _getTsProgram() {
    return this._JitMode ? this._program as ts.Program : (this._program as Program).getTsProgram();
  }

  private _getChangedTsFiles() {
    return this._compilerHost.getChangedFilePaths()
      .filter(k => k.endsWith('.ts') && !k.endsWith('.d.ts'))
      .filter(k => this._compilerHost.fileExists(k));
  }

  private _createOrUpdateProgram() {
    const changedTsFiles = this._getChangedTsFiles();
    changedTsFiles.forEach((file) => {
      if (!this._tsFilenames.includes(file)) {
        // TODO: figure out if action is needed for files that were removed from the compilation.
        this._tsFilenames.push(file);
      }
    });

    // Update the forked type checker.
    if (this._forkTypeChecker && !this._firstRun) {
      this._updateForkedTypeChecker(changedTsFiles);
    }

    if (this._JitMode) {

      // Create the TypeScript program.
      time('AngularCompilerPlugin._createOrUpdateProgram.ts.createProgram');
      this._program = ts.createProgram(
        this._tsFilenames,
        this._angularCompilerOptions,
        this._angularCompilerHost,
        this._program as ts.Program
      );
      timeEnd('AngularCompilerPlugin._createOrUpdateProgram.ts.createProgram');

      return Promise.resolve();
    } else {
      time('AngularCompilerPlugin._createOrUpdateProgram.ng.createProgram');
      // Create the Angular program.
      this._program = createProgram({
        rootNames: this._tsFilenames,
        options: this._angularCompilerOptions,
        host: this._angularCompilerHost,
        oldProgram: this._program as Program
      });
      timeEnd('AngularCompilerPlugin._createOrUpdateProgram.ng.createProgram');

      time('AngularCompilerPlugin._createOrUpdateProgram.ng.loadNgStructureAsync');
      return this._program.loadNgStructureAsync().then(() =>
        timeEnd('AngularCompilerPlugin._createOrUpdateProgram.ng.loadNgStructureAsync'));
    }
  }

  private _getLazyRoutesFromNgtools() {
    try {
      time('AngularCompilerPlugin._getLazyRoutesFromNgtools');
      const result = __NGTOOLS_PRIVATE_API_2.listLazyRoutes({
        program: this._getTsProgram(),
        host: this._compilerHost,
        angularCompilerOptions: Object.assign({}, this._angularCompilerOptions, {
          // genDir seems to still be needed in @angular\compiler-cli\src\compiler_host.js:226.
          genDir: ''
        }),
        entryModule: this._entryModule
      });
      timeEnd('AngularCompilerPlugin._getLazyRoutesFromNgtools');
      return result;
    } catch (err) {
      // We silence the error that the @angular/router could not be found. In that case, there is
      // basically no route supported by the app itself.
      if (err.message.startsWith('Could not resolve module @angular/router')) {
        return {};
      } else {
        throw err;
      }
    }
  }

  private _findLazyRoutesInAst(changedFilePaths: string[]): LazyRouteMap {
    time('AngularCompilerPlugin._findLazyRoutesInAst');
    const result: LazyRouteMap = Object.create(null);
    for (const filePath of changedFilePaths) {
      const fileLazyRoutes = findLazyRoutes(filePath, this._compilerHost, undefined,
        this._compilerOptions);
      for (const routeKey of Object.keys(fileLazyRoutes)) {
        const route = fileLazyRoutes[routeKey];
        result[routeKey] = route;
      }
    }
    timeEnd('AngularCompilerPlugin._findLazyRoutesInAst');
    return result;
  }

  // Process the lazy routes discovered, adding then to _lazyRoutes.
  // TODO: find a way to remove lazy routes that don't exist anymore.
  // This will require a registry of known references to a lazy route, removing it when no
  // module references it anymore.
  private _processLazyRoutes(discoveredLazyRoutes: { [route: string]: string; }) {
    Object.keys(discoveredLazyRoutes)
      .forEach(lazyRouteKey => {
        const [lazyRouteModule, moduleName] = lazyRouteKey.split('#');

        if (!lazyRouteModule || !moduleName) {
          return;
        }

        const lazyRouteTSFile = discoveredLazyRoutes[lazyRouteKey];
        let modulePath: string, moduleKey: string;

        if (this._JitMode) {
          modulePath = lazyRouteTSFile;
          moduleKey = lazyRouteKey;
        } else {
          modulePath = lazyRouteTSFile.replace(/(\.d)?\.ts$/, `.ngfactory.js`);
          moduleKey = `${lazyRouteModule}.ngfactory#${moduleName}NgFactory`;
        }

        if (moduleKey in this._lazyRoutes) {
          if (this._lazyRoutes[moduleKey] !== modulePath) {
            // Found a duplicate, this is an error.
            this._compilation.warnings.push(
              new Error(`Duplicated path in loadChildren detected during a rebuild. `
                + `We will take the latest version detected and override it to save rebuild time. `
                + `You should perform a full build to validate that your routes don't overlap.`)
            );
          }
        } else {
          // Found a new route, add it to the map and read it into the compiler host.
          this._lazyRoutes[moduleKey] = modulePath;
          this._angularCompilerHost.readFile(lazyRouteTSFile);
          this._angularCompilerHost.invalidate(lazyRouteTSFile);
        }
      });
  }

  private _createForkedTypeChecker() {
    // Bootstrap type checker is using local CLI.
    const g: any = global;
    const typeCheckerFile: string = g['angularCliIsLocal']
      ? './type_checker_bootstrap.js'
      : './type_checker.js';

    this._typeCheckerProcess = fork(path.resolve(__dirname, typeCheckerFile));
    this._typeCheckerProcess.send(new InitMessage(this._compilerOptions, this._basePath,
      this._JitMode, this._tsFilenames));

    // Cleanup.
    const killTypeCheckerProcess = () => {
      treeKill(this._typeCheckerProcess.pid, 'SIGTERM');
      process.exit();
    };
    process.on('exit', killTypeCheckerProcess);
    process.on('SIGINT', killTypeCheckerProcess);
    process.on('uncaughtException', killTypeCheckerProcess);
  }

  private _updateForkedTypeChecker(changedTsFiles: string[]) {
    this._typeCheckerProcess.send(new UpdateMessage(changedTsFiles));
  }


  // Registration hook for webpack plugin.
  apply(compiler: any) {
    this._compiler = compiler;

    // Decorate inputFileSystem to serve contents of CompilerHost.
    // Use decorated inputFileSystem in watchFileSystem.
    compiler.plugin('environment', () => {
      compiler.inputFileSystem = new VirtualFileSystemDecorator(
        compiler.inputFileSystem, this._compilerHost);
      compiler.watchFileSystem = new NodeWatchFileSystem(compiler.inputFileSystem);
    });

    // Add lazy modules to the context module for @angular/core
    compiler.plugin('context-module-factory', (cmf: any) => {
      const angularCorePackagePath = require.resolve('@angular/core/package.json');
      const angularCorePackageJson = require(angularCorePackagePath);
      const angularCoreModulePath = path.resolve(path.dirname(angularCorePackagePath),
        angularCorePackageJson['module']);
      // Pick the last part after the last node_modules instance. We do this to let people have
      // a linked @angular/core or cli which would not be under the same path as the project
      // being built.
      const angularCoreModuleDir = path.dirname(angularCoreModulePath).split(/node_modules/).pop();

      // Also support the es2015 in Angular versions that have it.
      let angularCoreEs2015Dir: string | undefined;
      if (angularCorePackageJson['es2015']) {
        const angularCoreEs2015Path = path.resolve(path.dirname(angularCorePackagePath),
          angularCorePackageJson['es2015']);
        angularCoreEs2015Dir = path.dirname(angularCoreEs2015Path).split(/node_modules/).pop();
      }

      cmf.plugin('after-resolve', (result: any, callback: (err?: any, request?: any) => void) => {
        if (!result) {
          return callback();
        }

        // Alter only request from Angular.
        if (!(angularCoreModuleDir && result.resource.endsWith(angularCoreModuleDir))
          && !(angularCoreEs2015Dir && result.resource.endsWith(angularCoreEs2015Dir))) {
          return callback(null, result);
        }

        this.done!.then(() => {
          // This folder does not exist, but we need to give webpack a resource.
          // TODO: check if we can't just leave it as is (angularCoreModuleDir).
          result.resource = path.join(this._basePath, '$$_lazy_route_resource');
          result.dependencies.forEach((d: any) => d.critical = false);
          result.resolveDependencies = (_fs: any, _resource: any, _recursive: any,
            _regExp: RegExp, cb: any) => {
            const dependencies = Object.keys(this._lazyRoutes)
              .map((key) => {
                const modulePath = this._lazyRoutes[key];
                const importPath = key.split('#')[0];
                if (modulePath !== null) {
                  return new ContextElementDependency(modulePath, importPath);
                } else {
                  return null;
                }
              })
              .filter(x => !!x);
            cb(null, dependencies);
          };
          return callback(null, result);
        }, () => callback(null))
          .catch(err => callback(err));
      });
    });

    // Remake the plugin on each compilation.
    compiler.plugin('make', (compilation: any, cb: any) => this._make(compilation, cb));
    compiler.plugin('invalid', () => this._firstRun = false);
    compiler.plugin('after-emit', (compilation: any, cb: any) => {
      compilation._ngToolsWebpackPluginInstance = null;
      cb();
    });
    compiler.plugin('done', () => {
      this._donePromise = null;
      this._compilation = null;
      this._failedCompilation = false;
    });

    // TODO: consider if it's better to remove this plugin and instead make it wait on the
    // VirtualFileSystemDecorator.
    compiler.plugin('after-resolvers', (compiler: any) => {
      // Virtual file system.
      // Wait for the plugin to be done when requesting `.ts` files directly (entry points), or
      // when the issuer is a `.ts` or `.ngfactory.js` file.
      compiler.resolvers.normal.plugin('before-resolve', (request: any, cb: () => void) => {
        if (request.request.endsWith('.ts')
          || (request.context.issuer && /\.ts|ngfactory\.js$/.test(request.context.issuer))) {
          this.done!.then(() => cb(), () => cb());
        } else {
          cb();
        }
      });
    });

    compiler.plugin('normal-module-factory', (nmf: any) => {
      compiler.resolvers.normal.apply(new PathsPlugin({
        nmf,
        tsConfigPath: this._tsConfigPath,
        compilerOptions: this._compilerOptions,
        compilerHost: this._compilerHost
      }));
    });
  }

  private _make(compilation: any, cb: (err?: any, request?: any) => void) {
    time('AngularCompilerPlugin._make');
    this._compilation = compilation;
    if (this._compilation._ngToolsWebpackPluginInstance) {
      return cb(new Error('An @ngtools/webpack plugin already exist for this compilation.'));
    }

    this._compilation._ngToolsWebpackPluginInstance = this;

    // Create the resource loader with the webpack compilation.
    time('AngularCompilerPlugin._make.setResourceLoader');
    const resourceLoader = new WebpackResourceLoader(compilation);
    this._compilerHost.setResourceLoader(resourceLoader);
    timeEnd('AngularCompilerPlugin._make.setResourceLoader');

    this._donePromise = Promise.resolve()
      .then(() => {
        // Create a new process for the type checker.
        if (this._forkTypeChecker && !this._firstRun && !this._typeCheckerProcess) {
          this._createForkedTypeChecker();
        }
      })
      .then(() => {
        if (this._firstRun) {
          // Use the WebpackResourceLoader with a resource loader to create an AngularCompilerHost.
          this._angularCompilerHost = createCompilerHost({
            options: this._angularCompilerOptions,
            tsHost: this._compilerHost
          }) as CompilerHost & WebpackCompilerHost;

          return this._createOrUpdateProgram()
            .then(() => {
              // If there's still no entryModule try to resolve from mainPath.
              if (!this._entryModule && this._options.mainPath) {
                time('AngularCompilerPlugin._make.resolveEntryModuleFromMain');
                const mainPath = path.resolve(this._basePath, this._options.mainPath);
                this._entryModule = resolveEntryModuleFromMain(
                  mainPath, this._compilerHost, this._getTsProgram());
                timeEnd('AngularCompilerPlugin._make.resolveEntryModuleFromMain');
              }
            });
        }
      })
      .then(() => this._update())
      .then(() => {
        timeEnd('AngularCompilerPlugin._make');
        cb();
      }, (err: any) => {
        this._failedCompilation = true;
        compilation.errors.push(err.stack);
        timeEnd('AngularCompilerPlugin._make');
        cb();
      });
  }

  private _update() {
    // We only want to update on TS and template changes, but all kinds of files are on this
    // list, like package.json and .ngsummary.json files.
    time('AngularCompilerPlugin._update');
    let changedFiles = this._compilerHost.getChangedFilePaths()
      .filter(k => /(ts|html|css|scss|sass|less|styl)/.test(k));

    return Promise.resolve()
      .then(() => {
        // Try to find lazy routes.
        // We need to run the `listLazyRoutes` the first time because it also navigates libraries
        // and other things that we might miss using the (faster) findLazyRoutesInAst.
        // Lazy routes modules will be read with compilerHost and added to the changed files.
        const changedTsFiles = this._compilerHost.getChangedFilePaths()
          .filter(k => k.endsWith('.ts'));
        if (this._firstRun) {
          this._processLazyRoutes(this._getLazyRoutesFromNgtools());
        } else if (changedTsFiles.length > 0) {
          this._processLazyRoutes(this._findLazyRoutesInAst(changedTsFiles));
        }
      })
      .then(() => {
        // Make a new program and load the Angular structure if there are changes.
        if (changedFiles.length > 0) {
          return this._createOrUpdateProgram();
        }
      })
      .then(() => {
        // Build transforms, emit and report errors if there are changes or it's the first run.
        if (changedFiles.length > 0 || this._firstRun) {

          // We now have the final list of changed TS files.
          // Go through each changed file and add transforms as needed.
          const sourceFiles = this._getChangedTsFiles().map((fileName) => {
            time('AngularCompilerPlugin._update.getSourceFile');
            const sourceFile = this._getTsProgram().getSourceFile(fileName);
            if (!sourceFile) {
              throw new Error(`${fileName} is not part of the TypeScript compilation. `
                + `Please include it in your tsconfig via the 'files' or 'include' property.`);
            }
            timeEnd('AngularCompilerPlugin._update.getSourceFile');
            return sourceFile;
          });

          time('AngularCompilerPlugin._update.transformOps');
          sourceFiles.forEach((sf) => {
            const fileName = this._compilerHost.resolve(sf.fileName);
            let transformOps = [];

            if (this._JitMode) {
              transformOps.push(...replaceResources(sf));
            }

            if (this._platform === PLATFORM.Browser) {
              if (!this._JitMode) {
                transformOps.push(...replaceBootstrap(sf, this.entryModule));
              }

              // If we have a locale, auto import the locale data file.
              if (this._angularCompilerOptions.i18nInLocale) {
                transformOps.push(...registerLocaleData(
                  sf,
                  this.entryModule,
                  this._angularCompilerOptions.i18nInLocale
                ));
              }
            } else if (this._platform === PLATFORM.Server) {
              if (fileName === this._compilerHost.resolve(this._options.mainPath)) {
                transformOps.push(...exportLazyModuleMap(sf, this._lazyRoutes));
                if (!this._JitMode) {
                  transformOps.push(...exportNgFactory(sf, this.entryModule));
                }
              }
            }

            // We need to keep a map of transforms for each file, to reapply on each update.
            this._transformMap.set(fileName, transformOps);
          });

          const transformOps: TransformOperation[] = [];
          for (let fileTransformOps of this._transformMap.values()) {
            transformOps.push(...fileTransformOps);
          }
          timeEnd('AngularCompilerPlugin._update.transformOps');

          time('AngularCompilerPlugin._update.makeTransform');
          const transformers: CustomTransformers = {
            beforeTs: transformOps.length > 0 ? [makeTransform(transformOps)] : []
          };
          timeEnd('AngularCompilerPlugin._update.makeTransform');

          // Emit files.
          time('AngularCompilerPlugin._update._emit');
          const { emitResult, diagnostics } = this._emit(sourceFiles, transformers);
          timeEnd('AngularCompilerPlugin._update._emit');

          // Report diagnostics.
          const errors = diagnostics
            .filter((diag) => diag.category === ts.DiagnosticCategory.Error);
          const warnings = diagnostics
            .filter((diag) => diag.category === ts.DiagnosticCategory.Warning);

          if (errors.length > 0) {
            const message = formatDiagnostics(this._angularCompilerOptions, errors);
            this._compilation.errors.push(message);
          }

          if (warnings.length > 0) {
            const message = formatDiagnostics(this._angularCompilerOptions, warnings);
            this._compilation.warnings.push(message);
          }

          // Reset changed files on successful compilation.
          if (emitResult && !emitResult.emitSkipped && this._compilation.errors.length === 0) {
            this._compilerHost.resetChangedFileTracker();
          } else {
            this._failedCompilation = true;
          }
        }
        timeEnd('AngularCompilerPlugin._update');
      });
  }

  writeI18nOutFile() {
    function _recursiveMkDir(p: string): Promise<void> {
      if (fs.existsSync(p)) {
        return Promise.resolve();
      } else {
        return _recursiveMkDir(path.dirname(p))
          .then(() => fs.mkdirSync(p));
      }
    }

    // Write the extracted messages to disk.
    const i18nOutFilePath = path.resolve(this._basePath, this._angularCompilerOptions.i18nOutFile);
    const i18nOutFileContent = this._compilerHost.readFile(i18nOutFilePath);
    if (i18nOutFileContent) {
      _recursiveMkDir(path.dirname(i18nOutFilePath))
        .then(() => fs.writeFileSync(i18nOutFilePath, i18nOutFileContent));
    }
  }

  getFile(fileName: string) {
    const outputFile = fileName.replace(/.ts$/, '.js');
    return {
      outputText: this._compilerHost.readFile(outputFile),
      sourceMap: this._compilerHost.readFile(outputFile + '.map')
    };
  }

  // This code mostly comes from `performCompilation` in `@angular/compiler-cli`.
  // It skips the program creation because we need to use `loadNgStructureAsync()`,
  // and uses CustomTransformers.
  private _emit(
    sourceFiles: ts.SourceFile[],
    customTransformers: ts.CustomTransformers & CustomTransformers
  ) {
    time('AngularCompilerPlugin._emit');
    const program = this._program;
    const allDiagnostics: Diagnostics = [];

    let emitResult: ts.EmitResult | undefined;
    try {
      if (this._JitMode) {
        const tsProgram = program as ts.Program;

        if (this._firstRun) {
          // Check parameter diagnostics.
          time('AngularCompilerPlugin._emit.ts.getOptionsDiagnostics');
          allDiagnostics.push(...tsProgram.getOptionsDiagnostics());
          timeEnd('AngularCompilerPlugin._emit.ts.getOptionsDiagnostics');
        }

        if (this._firstRun || !this._forkTypeChecker) {
          allDiagnostics.push(...gatherDiagnostics(this._program, this._JitMode,
            'AngularCompilerPlugin._emit.ts'));
        }

        if (!hasErrors(allDiagnostics)) {
          sourceFiles.forEach((sf) => {
            const timeLabel = `AngularCompilerPlugin._emit.ts+${sf.fileName}+.emit`;
            time(timeLabel);
            emitResult = tsProgram.emit(sf, undefined, undefined, undefined,
              { before: customTransformers.beforeTs }
            );
            allDiagnostics.push(...emitResult.diagnostics);
            timeEnd(timeLabel);
          });
        }
      } else {
        const angularProgram = program as Program;

        if (this._firstRun) {
          // Check TypeScript parameter diagnostics.
          time('AngularCompilerPlugin._emit.ng.getTsOptionDiagnostics');
          allDiagnostics.push(...angularProgram.getTsOptionDiagnostics());
          timeEnd('AngularCompilerPlugin._emit.ng.getTsOptionDiagnostics');

          // Check Angular parameter diagnostics.
          time('AngularCompilerPlugin._emit.ng.getNgOptionDiagnostics');
          allDiagnostics.push(...angularProgram.getNgOptionDiagnostics());
          timeEnd('AngularCompilerPlugin._emit.ng.getNgOptionDiagnostics');
        }

        if (this._firstRun || !this._forkTypeChecker) {
          allDiagnostics.push(...gatherDiagnostics(this._program, this._JitMode,
            'AngularCompilerPlugin._emit.ng'));
        }

        if (!hasErrors(allDiagnostics)) {
          time('AngularCompilerPlugin._emit.ng.emit');
          const extractI18n = !!this._angularCompilerOptions.i18nOutFile;
          const emitFlags = extractI18n ? EmitFlags.I18nBundle : EmitFlags.Default;
          emitResult = angularProgram.emit({ emitFlags, customTransformers });
          allDiagnostics.push(...emitResult.diagnostics);
          if (extractI18n) {
            this.writeI18nOutFile();
          }
          timeEnd('AngularCompilerPlugin._emit.ng.emit');
        }
      }
    } catch (e) {
      time('AngularCompilerPlugin._emit.catch');
      // This function is available in the import below, but this way we avoid the dependency.
      // import { isSyntaxError } from '@angular/compiler';
      function isSyntaxError(error: Error): boolean {
        return (error as any)['ngSyntaxError'];
      }

      let errMsg: string;
      let code: number;
      if (isSyntaxError(e)) {
        // don't report the stack for syntax errors as they are well known errors.
        errMsg = e.message;
        code = DEFAULT_ERROR_CODE;
      } else {
        errMsg = e.stack;
        // It is not a syntax error we might have a program with unknown state, discard it.
        this._program = undefined;
        code = UNKNOWN_ERROR_CODE;
      }
      allDiagnostics.push(
        { category: ts.DiagnosticCategory.Error, messageText: errMsg, code, source: SOURCE });
      timeEnd('AngularCompilerPlugin._emit.catch');
    }
    timeEnd('AngularCompilerPlugin._emit');
    return { program, emitResult, diagnostics: allDiagnostics };
  }

  private _validateLocale(locale: string) {
    // Get the path of the common module.
    const commonPath = path.dirname(require.resolve('@angular/common/package.json'));
    // Check if the locale file exists
    if (!fs.existsSync(path.resolve(commonPath, 'locales', `${locale}.js`))) {
      // Check for an alternative locale (if the locale id was badly formatted).
      const locales = fs.readdirSync(path.resolve(commonPath, 'locales'))
        .filter(file => file.endsWith('.js'))
        .map(file => file.replace('.js', ''));

      let newLocale;
      const normalizedLocale = locale.toLowerCase().replace(/_/g, '-');
      for (const l of locales) {
        if (l.toLowerCase() === normalizedLocale) {
          newLocale = l;
          break;
        }
      }

      if (newLocale) {
        locale = newLocale;
      } else {
        // Check for a parent locale
        const parentLocale = normalizedLocale.split('-')[0];
        if (locales.indexOf(parentLocale) !== -1) {
          locale = parentLocale;
        } else {
          throw new Error(
            `Unable to load the locale data file "@angular/common/locales/${locale}", ` +
            `please check that "${locale}" is a valid locale id.`);
        }
      }
    }

    return locale;
  }
}

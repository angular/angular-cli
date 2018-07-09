/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { dirname, normalize, resolve, virtualFs } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { ChildProcess, ForkOptions, fork } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { Compiler, compilation } from 'webpack';
import { time, timeEnd } from './benchmark';
import { WebpackCompilerHost, workaroundResolve } from './compiler_host';
import { resolveEntryModuleFromMain } from './entry_resolver';
import { gatherDiagnostics, hasErrors } from './gather_diagnostics';
import { LazyRouteMap, findLazyRoutes } from './lazy_routes';
import {
  CompilerCliIsSupported,
  CompilerHost,
  CompilerOptions,
  DEFAULT_ERROR_CODE,
  Diagnostic,
  EmitFlags,
  Program,
  SOURCE,
  UNKNOWN_ERROR_CODE,
  VERSION,
  __NGTOOLS_PRIVATE_API_2,
  createCompilerHost,
  createProgram,
  formatDiagnostics,
  readConfiguration,
} from './ngtools_api';
import { resolveWithPaths } from './paths-plugin';
import { WebpackResourceLoader } from './resource_loader';
import {
  exportLazyModuleMap,
  exportNgFactory,
  findResources,
  registerLocaleData,
  removeDecorators,
  replaceBootstrap,
  replaceResources,
  replaceServerBootstrap,
} from './transformers';
import { collectDeepNodes } from './transformers/ast_helpers';
import { AUTO_START_ARG, InitMessage, UpdateMessage } from './type_checker';
import {
  VirtualFileSystemDecorator,
  VirtualWatchFileSystemDecorator,
} from './virtual_file_system_decorator';
import {
  Callback,
  InputFileSystem,
  NodeWatchFileSystemInterface,
  NormalModuleFactoryRequest,
} from './webpack';

const treeKill = require('tree-kill');

export interface ContextElementDependency {}

export interface ContextElementDependencyConstructor {
  new(modulePath: string, name: string): ContextElementDependency;
}

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
  hostReplacementPaths?: { [path: string]: string };
  forkTypeChecker?: boolean;
  // TODO: remove singleFileIncludes for 2.0, this is just to support old projects that did not
  // include 'polyfills.ts' in `tsconfig.spec.json'.
  singleFileIncludes?: string[];
  i18nInFile?: string;
  i18nInFormat?: string;
  i18nOutFile?: string;
  i18nOutFormat?: string;
  locale?: string;
  missingTranslation?: string;
  platform?: PLATFORM;
  nameLazyFiles?: boolean;

  // added to the list of lazy routes
  additionalLazyModules?: { [module: string]: string };

  // The ContextElementDependency of correct Webpack compilation.
  // This is needed when there are multiple Webpack installs.
  contextElementDependencyConstructor?: ContextElementDependencyConstructor;

  // Use tsconfig to include path globs.
  compilerOptions?: ts.CompilerOptions;

  host?: virtualFs.Host<fs.Stats>;
  platformTransformers?: ts.TransformerFactory<ts.SourceFile>[];
}

export enum PLATFORM {
  Browser,
  Server,
}

export class AngularCompilerPlugin {
  private _options: AngularCompilerPluginOptions;

  // TS compilation.
  private _compilerOptions: CompilerOptions;
  private _rootNames: string[];
  private _singleFileIncludes: string[] = [];
  private _program: (ts.Program | Program) | null;
  private _compilerHost: WebpackCompilerHost & CompilerHost;
  private _moduleResolutionCache: ts.ModuleResolutionCache;
  private _resourceLoader: WebpackResourceLoader;
  // Contains `moduleImportPath#exportName` => `fullModulePath`.
  private _lazyRoutes: LazyRouteMap = Object.create(null);
  private _tsConfigPath: string;
  private _entryModule: string | null;
  private _mainPath: string | undefined;
  private _basePath: string;
  private _transformers: ts.TransformerFactory<ts.SourceFile>[] = [];
  private _platformTransformers: ts.TransformerFactory<ts.SourceFile>[] | null = null;
  private _platform: PLATFORM;
  private _JitMode = false;
  private _emitSkipped = true;
  private _changedFileExtensions = new Set(['ts', 'html', 'css']);

  // Webpack plugin.
  private _firstRun = true;
  private _donePromise: Promise<void> | null;
  private _normalizedLocale: string | null;
  private _warnings: (string | Error)[] = [];
  private _errors: (string | Error)[] = [];
  private _contextElementDependencyConstructor: ContextElementDependencyConstructor;

  // TypeChecker process.
  private _forkTypeChecker = true;
  private _typeCheckerProcess: ChildProcess | null;
  private _forkedTypeCheckerInitialized = false;

  private get _ngCompilerSupportsNewApi() {
    if (this._JitMode) {
      return false;
    } else {
      return !!(this._program as Program).listLazyRoutes;
    }
  }

  constructor(options: AngularCompilerPluginOptions) {
    CompilerCliIsSupported();
    this._options = Object.assign({}, options);
    this._setupOptions(this._options);
  }

  get options() { return this._options; }
  get done() { return this._donePromise; }
  get entryModule() {
    if (!this._entryModule) {
      return null;
    }
    const splitted = this._entryModule.split(/(#[a-zA-Z_]([\w]+))$/);
    const path = splitted[0];
    const className = !!splitted[1] ? splitted[1].substring(1) : 'default';

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
    if (options.basePath !== undefined) {
      basePath = path.resolve(process.cwd(), options.basePath);
    }

    if (options.singleFileIncludes !== undefined) {
      this._singleFileIncludes.push(...options.singleFileIncludes);
    }

    // Parse the tsconfig contents.
    const config = readConfiguration(this._tsConfigPath);
    if (config.errors && config.errors.length) {
      throw new Error(formatDiagnostics(config.errors));
    }

    this._rootNames = config.rootNames.concat(...this._singleFileIncludes);
    this._compilerOptions = { ...config.options, ...options.compilerOptions };
    this._basePath = config.options.basePath || basePath || '';

    // Overwrite outDir so we can find generated files next to their .ts origin in compilerHost.
    this._compilerOptions.outDir = '';
    this._compilerOptions.suppressOutputPathCheck = true;

    // Default plugin sourceMap to compiler options setting.
    if (!options.hasOwnProperty('sourceMap')) {
      options.sourceMap = this._compilerOptions.sourceMap || false;
    }

    // Force the right sourcemap options.
    if (options.sourceMap) {
      this._compilerOptions.sourceMap = true;
      this._compilerOptions.inlineSources = true;
      this._compilerOptions.inlineSourceMap = false;
      this._compilerOptions.mapRoot = undefined;
      // We will set the source to the full path of the file in the loader, so we don't
      // need sourceRoot here.
      this._compilerOptions.sourceRoot = undefined;
    } else {
      this._compilerOptions.sourceMap = false;
      this._compilerOptions.sourceRoot = undefined;
      this._compilerOptions.inlineSources = undefined;
      this._compilerOptions.inlineSourceMap = undefined;
      this._compilerOptions.mapRoot = undefined;
      this._compilerOptions.sourceRoot = undefined;
    }

    // We want to allow emitting with errors so that imports can be added
    // to the webpack dependency tree and rebuilds triggered by file edits.
    this._compilerOptions.noEmitOnError = false;

    // Set JIT (no code generation) or AOT mode.
    if (options.skipCodeGeneration !== undefined) {
      this._JitMode = options.skipCodeGeneration;
    }

    // Process i18n options.
    if (options.i18nInFile !== undefined) {
      this._compilerOptions.i18nInFile = options.i18nInFile;
    }
    if (options.i18nInFormat !== undefined) {
      this._compilerOptions.i18nInFormat = options.i18nInFormat;
    }
    if (options.i18nOutFile !== undefined) {
      this._compilerOptions.i18nOutFile = options.i18nOutFile;
    }
    if (options.i18nOutFormat !== undefined) {
      this._compilerOptions.i18nOutFormat = options.i18nOutFormat;
    }
    if (options.locale !== undefined) {
      this._compilerOptions.i18nInLocale = options.locale;
      this._compilerOptions.i18nOutLocale = options.locale;
      this._normalizedLocale = this._validateLocale(options.locale);
    }
    if (options.missingTranslation !== undefined) {
      this._compilerOptions.i18nInMissingTranslations =
        options.missingTranslation as 'error' | 'warning' | 'ignore';
    }

    // Process forked type checker options.
    if (options.forkTypeChecker !== undefined) {
      this._forkTypeChecker = options.forkTypeChecker;
    }

    // Add custom platform transformers.
    if (options.platformTransformers !== undefined) {
      this._platformTransformers = options.platformTransformers;
    }

    // Default ContextElementDependency to the one we can import from here.
    // Failing to use the right ContextElementDependency will throw the error below:
    // "No module factory available for dependency type: ContextElementDependency"
    // Hoisting together with peer dependencies can make it so the imported
    // ContextElementDependency does not come from the same Webpack instance that is used
    // in the compilation. In that case, we can pass the right one as an option to the plugin.
    this._contextElementDependencyConstructor = options.contextElementDependencyConstructor
      || require('webpack/lib/dependencies/ContextElementDependency');


    let host: virtualFs.Host<fs.Stats> = options.host || new NodeJsSyncHost();
    if (options.hostReplacementPaths) {
      const aliasHost = new virtualFs.AliasHost(host);
      for (const from in options.hostReplacementPaths) {
        aliasHost.aliases.set(normalize(from), normalize(options.hostReplacementPaths[from]));
      }
      host = aliasHost;
    }

    // Create the webpack compiler host.
    const webpackCompilerHost = new WebpackCompilerHost(
      this._compilerOptions,
      this._basePath,
      host,
    );
    webpackCompilerHost.enableCaching();

    // Create and set a new WebpackResourceLoader.
    this._resourceLoader = new WebpackResourceLoader();
    webpackCompilerHost.setResourceLoader(this._resourceLoader);

    // Use the WebpackCompilerHost with a resource loader to create an AngularCompilerHost.
    this._compilerHost = createCompilerHost({
      options: this._compilerOptions,
      tsHost: webpackCompilerHost,
    }) as CompilerHost & WebpackCompilerHost;

    // Resolve mainPath if provided.
    if (options.mainPath) {
      this._mainPath = this._compilerHost.resolve(options.mainPath);
    }

    // Use entryModule if available in options, otherwise resolve it from mainPath after program
    // creation.
    if (this._options.entryModule) {
      this._entryModule = this._options.entryModule;
    } else if (this._compilerOptions.entryModule) {
      this._entryModule = path.resolve(this._basePath,
        this._compilerOptions.entryModule as string); // temporary cast for type issue
    }

    // Set platform.
    this._platform = options.platform || PLATFORM.Browser;

    // Make transformers.
    this._makeTransformers();

    timeEnd('AngularCompilerPlugin._setupOptions');
  }

  private _getTsProgram() {
    return this._JitMode ? this._program as ts.Program : (this._program as Program).getTsProgram();
  }

  private _getChangedTsFiles() {
    return this._compilerHost.getChangedFilePaths()
      .filter(k => (k.endsWith('.ts') || k.endsWith('.tsx')) && !k.endsWith('.d.ts'))
      .filter(k => this._compilerHost.fileExists(k));
  }

  updateChangedFileExtensions(extension: string) {
    if (extension) {
      this._changedFileExtensions.add(extension);
    }
  }

  private _getChangedCompilationFiles() {
    return this._compilerHost.getChangedFilePaths()
      .filter(k => {
        for (const ext of this._changedFileExtensions) {
          if (k.endsWith(ext)) {
            return true;
          }
        }

        return false;
      });
  }

  private _createOrUpdateProgram() {
    return Promise.resolve()
      .then(() => {
        // Get the root files from the ts config.
        // When a new root name (like a lazy route) is added, it won't be available from
        // following imports on the existing files, so we need to get the new list of root files.
        const config = readConfiguration(this._tsConfigPath);
        this._rootNames = config.rootNames.concat(...this._singleFileIncludes);

        // Update the forked type checker with all changed compilation files.
        // This includes templates, that also need to be reloaded on the type checker.
        if (this._forkTypeChecker && this._typeCheckerProcess && !this._firstRun) {
          this._updateForkedTypeChecker(this._rootNames, this._getChangedCompilationFiles());
        }

         // Use an identity function as all our paths are absolute already.
        this._moduleResolutionCache = ts.createModuleResolutionCache(this._basePath, x => x);

        if (this._JitMode) {
          // Create the TypeScript program.
          time('AngularCompilerPlugin._createOrUpdateProgram.ts.createProgram');
          this._program = ts.createProgram(
            this._rootNames,
            this._compilerOptions,
            this._compilerHost,
            this._program as ts.Program,
          );
          timeEnd('AngularCompilerPlugin._createOrUpdateProgram.ts.createProgram');

          return Promise.resolve();
        } else {
          time('AngularCompilerPlugin._createOrUpdateProgram.ng.createProgram');
          // Create the Angular program.
          this._program = createProgram({
            rootNames: this._rootNames,
            options: this._compilerOptions,
            host: this._compilerHost,
            oldProgram: this._program as Program,
          });
          timeEnd('AngularCompilerPlugin._createOrUpdateProgram.ng.createProgram');

          time('AngularCompilerPlugin._createOrUpdateProgram.ng.loadNgStructureAsync');

          return this._program.loadNgStructureAsync()
            .then(() => {
              timeEnd('AngularCompilerPlugin._createOrUpdateProgram.ng.loadNgStructureAsync');
            });
        }
      })
      .then(() => {
        // If there's still no entryModule try to resolve from mainPath.
        if (!this._entryModule && this._mainPath) {
          time('AngularCompilerPlugin._make.resolveEntryModuleFromMain');
          this._entryModule = resolveEntryModuleFromMain(
            this._mainPath, this._compilerHost, this._getTsProgram());
          timeEnd('AngularCompilerPlugin._make.resolveEntryModuleFromMain');
        }
      });
  }

  private _getLazyRoutesFromNgtools() {
    try {
      time('AngularCompilerPlugin._getLazyRoutesFromNgtools');
      const result = __NGTOOLS_PRIVATE_API_2.listLazyRoutes({
        program: this._getTsProgram(),
        host: this._compilerHost,
        angularCompilerOptions: Object.assign({}, this._compilerOptions, {
          // genDir seems to still be needed in @angular\compiler-cli\src\compiler_host.js:226.
          genDir: '',
        }),
        // TODO: fix compiler-cli typings; entryModule should not be string, but also optional.
        // tslint:disable-next-line:non-null-operator
        entryModule: this._entryModule !,
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

  private _listLazyRoutesFromProgram(): LazyRouteMap {
    const ngProgram = this._program as Program;
    if (!ngProgram.listLazyRoutes) {
      throw new Error('_listLazyRoutesFromProgram was called with an old program.');
    }

    const lazyRoutes = ngProgram.listLazyRoutes();

    return lazyRoutes.reduce(
      (acc, curr) => {
        const ref = curr.route;
        if (ref in acc && acc[ref] !== curr.referencedModule.filePath) {
          throw new Error(
            + `Duplicated path in loadChildren detected: "${ref}" is used in 2 loadChildren, `
            + `but they point to different modules "(${acc[ref]} and `
            + `"${curr.referencedModule.filePath}"). Webpack cannot distinguish on context and `
            + 'would fail to load the proper one.',
          );
        }
        acc[ref] = curr.referencedModule.filePath;

        return acc;
      },
      {} as LazyRouteMap,
    );
  }

  // Process the lazy routes discovered, adding then to _lazyRoutes.
  // TODO: find a way to remove lazy routes that don't exist anymore.
  // This will require a registry of known references to a lazy route, removing it when no
  // module references it anymore.
  private _processLazyRoutes(discoveredLazyRoutes: LazyRouteMap) {
    Object.keys(discoveredLazyRoutes)
      .forEach(lazyRouteKey => {
        const [lazyRouteModule, moduleName] = lazyRouteKey.split('#');

        if (!lazyRouteModule) {
          return;
        }

        const lazyRouteTSFile = discoveredLazyRoutes[lazyRouteKey].replace(/\\/g, '/');
        let modulePath: string, moduleKey: string;

        if (this._JitMode) {
          modulePath = lazyRouteTSFile;
          moduleKey = `${lazyRouteModule}${moduleName ? '#' + moduleName : ''}`;
        } else {
          modulePath = lazyRouteTSFile.replace(/(\.d)?\.tsx?$/, '');
          modulePath += '.ngfactory.js';
          const factoryModuleName = moduleName ? `#${moduleName}NgFactory` : '';
          moduleKey = `${lazyRouteModule}.ngfactory${factoryModuleName}`;
        }

        modulePath = workaroundResolve(modulePath);

        if (moduleKey in this._lazyRoutes) {
          if (this._lazyRoutes[moduleKey] !== modulePath) {
            // Found a duplicate, this is an error.
            this._warnings.push(
              new Error(`Duplicated path in loadChildren detected during a rebuild. `
                + `We will take the latest version detected and override it to save rebuild time. `
                + `You should perform a full build to validate that your routes don't overlap.`),
            );
          }
        } else {
          // Found a new route, add it to the map.
          this._lazyRoutes[moduleKey] = modulePath;
        }
      });
  }

  private _createForkedTypeChecker() {
    // Bootstrap type checker is using local CLI.
    const g: any = typeof global !== 'undefined' ? global : {};  // tslint:disable-line:no-any
    const typeCheckerFile: string = g['_DevKitIsLocal']
      ? './type_checker_bootstrap.js'
      : './type_checker_worker.js';

    const debugArgRegex = /--inspect(?:-brk|-port)?|--debug(?:-brk|-port)/;

    const execArgv = process.execArgv.filter((arg) => {
      // Remove debug args.
      // Workaround for https://github.com/nodejs/node/issues/9435
      return !debugArgRegex.test(arg);
    });
    // Signal the process to start listening for messages
    // Solves https://github.com/angular/angular-cli/issues/9071
    const forkArgs = [AUTO_START_ARG];
    const forkOptions: ForkOptions = { execArgv };

    this._typeCheckerProcess = fork(
      path.resolve(__dirname, typeCheckerFile),
      forkArgs,
      forkOptions);

    // Handle child process exit.
    this._typeCheckerProcess.once('exit', (_, signal) => {
      this._typeCheckerProcess = null;

      // If process exited not because of SIGTERM (see _killForkedTypeChecker), than something
      // went wrong and it should fallback to type checking on the main thread.
      if (signal !== 'SIGTERM') {
        this._forkTypeChecker = false;
        const msg = 'AngularCompilerPlugin: Forked Type Checker exited unexpectedly. ' +
          'Falling back to type checking on main thread.';
        this._warnings.push(msg);
      }
    });
  }

  private _killForkedTypeChecker() {
    if (this._typeCheckerProcess && this._typeCheckerProcess.pid) {
      treeKill(this._typeCheckerProcess.pid, 'SIGTERM');
      this._typeCheckerProcess = null;
    }
  }

  private _updateForkedTypeChecker(rootNames: string[], changedCompilationFiles: string[]) {
    if (this._typeCheckerProcess) {
      if (!this._forkedTypeCheckerInitialized) {
        this._typeCheckerProcess.send(new InitMessage(this._compilerOptions, this._basePath,
          this._JitMode, this._rootNames));
        this._forkedTypeCheckerInitialized = true;
      }
      this._typeCheckerProcess.send(new UpdateMessage(rootNames, changedCompilationFiles));
    }
  }

  // Registration hook for webpack plugin.
  apply(compiler: Compiler) {
    // Decorate inputFileSystem to serve contents of CompilerHost.
    // Use decorated inputFileSystem in watchFileSystem.
    compiler.hooks.environment.tap('angular-compiler', () => {
      // The webpack types currently do not include these
      const compilerWithFileSystems = compiler as Compiler & {
        inputFileSystem: InputFileSystem,
        watchFileSystem: NodeWatchFileSystemInterface,
      };

      const inputDecorator = new VirtualFileSystemDecorator(
        compilerWithFileSystems.inputFileSystem,
        this._compilerHost,
      );
      compilerWithFileSystems.inputFileSystem = inputDecorator;
      compilerWithFileSystems.watchFileSystem = new VirtualWatchFileSystemDecorator(
        inputDecorator,
      );
    });

    // Add lazy modules to the context module for @angular/core
    compiler.hooks.contextModuleFactory.tap('angular-compiler', cmf => {
      const angularCorePackagePath = require.resolve('@angular/core/package.json');

      // APFv6 does not have single FESM anymore. Instead of verifying if we're pointing to
      // FESMs, we resolve the `@angular/core` path and verify that the path for the
      // module starts with it.

      // This may be slower but it will be compatible with both APF5, 6 and potential future
      // versions (until the dynamic import appears outside of core I suppose).
      // We resolve any symbolic links in order to get the real path that would be used in webpack.
      const angularCoreDirname = fs.realpathSync(path.dirname(angularCorePackagePath));

      cmf.hooks.afterResolve.tapPromise('angular-compiler', async result => {
        // Alter only request from Angular.
        if (!result || !this.done || !result.resource.startsWith(angularCoreDirname)) {
          return result;
        }

        return this.done.then(
          () => {
            // This folder does not exist, but we need to give webpack a resource.
            // TODO: check if we can't just leave it as is (angularCoreModuleDir).
            result.resource = path.join(this._basePath, '$$_lazy_route_resource');
            // tslint:disable-next-line:no-any
            result.dependencies.forEach((d: any) => d.critical = false);
            // tslint:disable-next-line:no-any
            result.resolveDependencies = (_fs: any, options: any, callback: Callback) => {
              const dependencies = Object.keys(this._lazyRoutes)
                .map((key) => {
                  const modulePath = this._lazyRoutes[key];
                  const importPath = key.split('#')[0];
                  if (modulePath !== null) {
                    const name = importPath.replace(/(\.ngfactory)?\.(js|ts)$/, '');

                    return new this._contextElementDependencyConstructor(modulePath, name);
                  } else {
                    return null;
                  }
                })
                .filter(x => !!x);

              if (this._options.nameLazyFiles) {
                options.chunkName = '[request]';
              }

              callback(null, dependencies);
            };

            return result;
          },
          () => undefined,
        );
      });
    });

    // Create and destroy forked type checker on watch mode.
    compiler.hooks.watchRun.tap('angular-compiler', () => {
      if (this._forkTypeChecker && !this._typeCheckerProcess) {
        this._createForkedTypeChecker();
      }
    });
    compiler.hooks.watchClose.tap('angular-compiler', () => this._killForkedTypeChecker());

    // Remake the plugin on each compilation.
    compiler.hooks.make.tapPromise('angular-compiler', compilation => this._make(compilation));
    compiler.hooks.invalid.tap('angular-compiler', () => this._firstRun = false);
    compiler.hooks.afterEmit.tap('angular-compiler', compilation => {
      // tslint:disable-next-line:no-any
      (compilation as any)._ngToolsWebpackPluginInstance = null;
    });
    compiler.hooks.done.tap('angular-compiler', () => {
      this._donePromise = null;
    });

    compiler.hooks.afterResolvers.tap('angular-compiler', compiler => {
      compiler.hooks.normalModuleFactory.tap('angular-compiler', nmf => {
        // Virtual file system.
        // TODO: consider if it's better to remove this plugin and instead make it wait on the
        // VirtualFileSystemDecorator.
        // Wait for the plugin to be done when requesting `.ts` files directly (entry points), or
        // when the issuer is a `.ts` or `.ngfactory.js` file.
        nmf.hooks.beforeResolve.tapPromise(
          'angular-compiler',
          async (request?: NormalModuleFactoryRequest) => {
            if (this.done && request) {
              const name = request.request;
              const issuer = request.contextInfo.issuer;
              if (name.endsWith('.ts') || name.endsWith('.tsx')
                  || (issuer && /\.ts|ngfactory\.js$/.test(issuer))) {
                try {
                  await this.done;
                } catch {}
              }
            }

            return request;
          },
        );
      });
    });

    compiler.hooks.normalModuleFactory.tap('angular-compiler', nmf => {
      nmf.hooks.beforeResolve.tapAsync(
        'angular-compiler',
        (request: NormalModuleFactoryRequest, callback: Callback<NormalModuleFactoryRequest>) => {
          resolveWithPaths(
            request,
            callback,
            this._compilerOptions,
            this._compilerHost,
            this._moduleResolutionCache,
          );
        },
      );
    });
  }

  private async _make(compilation: compilation.Compilation) {
    time('AngularCompilerPlugin._make');
    this._emitSkipped = true;
    // tslint:disable-next-line:no-any
    if ((compilation as any)._ngToolsWebpackPluginInstance) {
      throw new Error('An @ngtools/webpack plugin already exist for this compilation.');
    }

    // Set a private variable for this plugin instance.
    // tslint:disable-next-line:no-any
    (compilation as any)._ngToolsWebpackPluginInstance = this;

    // Update the resource loader with the new webpack compilation.
    this._resourceLoader.update(compilation);

    return this._donePromise = Promise.resolve()
      .then(() => this._update())
      .then(() => {
        this.pushCompilationErrors(compilation);
        timeEnd('AngularCompilerPlugin._make');
      }, err => {
        compilation.errors.push(err);
        this.pushCompilationErrors(compilation);
        timeEnd('AngularCompilerPlugin._make');
      });
  }

  private pushCompilationErrors(compilation: compilation.Compilation) {
    compilation.errors.push(...this._errors);
    compilation.warnings.push(...this._warnings);
    this._errors = [];
    this._warnings = [];
  }

  private _makeTransformers() {
    const isAppPath = (fileName: string) =>
      !fileName.endsWith('.ngfactory.ts') && !fileName.endsWith('.ngstyle.ts');
    const isMainPath = (fileName: string) => fileName === (
      this._mainPath ? workaroundResolve(this._mainPath) : this._mainPath
    );
    const getEntryModule = () => this.entryModule
      ? { path: workaroundResolve(this.entryModule.path), className: this.entryModule.className }
      : this.entryModule;
    const getLazyRoutes = () => this._lazyRoutes;
    const getTypeChecker = () => this._getTsProgram().getTypeChecker();

    if (this._JitMode) {
      // Replace resources in JIT.
      this._transformers.push(replaceResources(isAppPath));
    } else {
      // Remove unneeded angular decorators.
      this._transformers.push(removeDecorators(isAppPath, getTypeChecker));
    }

    if (this._platformTransformers !== null) {
      this._transformers.push(...this._platformTransformers);
    } else {
      if (this._platform === PLATFORM.Browser) {
        // If we have a locale, auto import the locale data file.
        // This transform must go before replaceBootstrap because it looks for the entry module
        // import, which will be replaced.
        if (this._normalizedLocale) {
          this._transformers.push(registerLocaleData(isAppPath, getEntryModule,
            this._normalizedLocale));
        }

        if (!this._JitMode) {
          // Replace bootstrap in browser AOT.
          this._transformers.push(replaceBootstrap(isAppPath, getEntryModule, getTypeChecker));
        }
      } else if (this._platform === PLATFORM.Server) {
        this._transformers.push(exportLazyModuleMap(isMainPath, getLazyRoutes));
        if (!this._JitMode) {
          this._transformers.push(
            exportNgFactory(isMainPath, getEntryModule),
            replaceServerBootstrap(isMainPath, getEntryModule, getTypeChecker));
        }
      }
    }
  }

  private _update() {
    time('AngularCompilerPlugin._update');
    // We only want to update on TS and template changes, but all kinds of files are on this
    // list, like package.json and .ngsummary.json files.
    const changedFiles = this._getChangedCompilationFiles();

    // If nothing we care about changed and it isn't the first run, don't do anything.
    if (changedFiles.length === 0 && !this._firstRun) {
      return Promise.resolve();
    }

    return Promise.resolve()
      // Make a new program and load the Angular structure.
      .then(() => this._createOrUpdateProgram())
      .then(() => {
        if (this.entryModule) {
          // Try to find lazy routes if we have an entry module.
          // We need to run the `listLazyRoutes` the first time because it also navigates libraries
          // and other things that we might miss using the (faster) findLazyRoutesInAst.
          // Lazy routes modules will be read with compilerHost and added to the changed files.
          const changedTsFiles = this._getChangedTsFiles();
          if (this._ngCompilerSupportsNewApi) {
            this._processLazyRoutes(this._listLazyRoutesFromProgram());
          } else if (this._firstRun) {
            this._processLazyRoutes(this._getLazyRoutesFromNgtools());
          } else if (changedTsFiles.length > 0) {
            this._processLazyRoutes(this._findLazyRoutesInAst(changedTsFiles));
          }
          if (this._options.additionalLazyModules) {
            this._processLazyRoutes(this._options.additionalLazyModules);
          }
        }
      })
      .then(() => {
        // Emit and report errors.

        // We now have the final list of changed TS files.
        // Go through each changed file and add transforms as needed.
        const sourceFiles = this._getChangedTsFiles()
          .map((fileName) => this._getTsProgram().getSourceFile(fileName))
          // At this point we shouldn't need to filter out undefined files, because any ts file
          // that changed should be emitted.
          // But due to hostReplacementPaths there can be files (the environment files)
          // that changed but aren't part of the compilation, specially on `ng test`.
          // So we ignore missing source files files here.
          // hostReplacementPaths needs to be fixed anyway to take care of the following issue.
          // https://github.com/angular/angular-cli/issues/7305#issuecomment-332150230
          .filter((x) => !!x) as ts.SourceFile[];

        // Emit files.
        time('AngularCompilerPlugin._update._emit');
        const { emitResult, diagnostics } = this._emit(sourceFiles);
        timeEnd('AngularCompilerPlugin._update._emit');

        // Report diagnostics.
        const errors = diagnostics
          .filter((diag) => diag.category === ts.DiagnosticCategory.Error);
        const warnings = diagnostics
          .filter((diag) => diag.category === ts.DiagnosticCategory.Warning);

        if (errors.length > 0) {
          const message = formatDiagnostics(errors);
          this._errors.push(new Error(message));
        }

        if (warnings.length > 0) {
          const message = formatDiagnostics(warnings);
          this._warnings.push(message);
        }

        this._emitSkipped = !emitResult || emitResult.emitSkipped;

        // Reset changed files on successful compilation.
        if (!this._emitSkipped && this._errors.length === 0) {
          this._compilerHost.resetChangedFileTracker();
        }
        timeEnd('AngularCompilerPlugin._update');
      });
  }

  writeI18nOutFile() {
    function _recursiveMkDir(p: string) {
      if (!fs.existsSync(p)) {
        _recursiveMkDir(path.dirname(p));
        fs.mkdirSync(p);
      }
    }

    // Write the extracted messages to disk.
    if (this._compilerOptions.i18nOutFile) {
      const i18nOutFilePath = path.resolve(this._basePath, this._compilerOptions.i18nOutFile);
      const i18nOutFileContent = this._compilerHost.readFile(i18nOutFilePath);
      if (i18nOutFileContent) {
        _recursiveMkDir(path.dirname(i18nOutFilePath));
        fs.writeFileSync(i18nOutFilePath, i18nOutFileContent);
      }
    }
  }

  getCompiledFile(fileName: string) {
    const outputFile = fileName.replace(/.tsx?$/, '.js');
    let outputText: string;
    let sourceMap: string | undefined;
    let errorDependencies: string[] = [];

    if (this._emitSkipped) {
      const text = this._compilerHost.readFile(outputFile);
      if (text) {
        // If the compilation didn't emit files this time, try to return the cached files from the
        // last compilation and let the compilation errors show what's wrong.
        outputText = text;
        sourceMap = this._compilerHost.readFile(outputFile + '.map');
      } else {
        // There's nothing we can serve. Return an empty string to prevent lenghty webpack errors,
        // add the rebuild warning if it's not there yet.
        // We also need to all changed files as dependencies of this file, so that all of them
        // will be watched and trigger a rebuild next time.
        outputText = '';
        errorDependencies = this._getChangedCompilationFiles()
          // These paths are used by the loader so we must denormalize them.
          .map((p) => this._compilerHost.denormalizePath(p));
      }
    } else {
      // Check if the TS input file and the JS output file exist.
      if (((fileName.endsWith('.ts') || fileName.endsWith('.tsx'))
        && !this._compilerHost.fileExists(fileName, false))
        || !this._compilerHost.fileExists(outputFile, false)) {
        let msg = `${fileName} is missing from the TypeScript compilation. `
          + `Please make sure it is in your tsconfig via the 'files' or 'include' property.`;

        if (/(\\|\/)node_modules(\\|\/)/.test(fileName)) {
          msg += '\nThe missing file seems to be part of a third party library. '
            + 'TS files in published libraries are often a sign of a badly packaged library. '
            + 'Please open an issue in the library repository to alert its author and ask them '
            + 'to package the library using the Angular Package Format (https://goo.gl/jB3GVv).';
        }

        throw new Error(msg);
      }

      outputText = this._compilerHost.readFile(outputFile) || '';
      sourceMap = this._compilerHost.readFile(outputFile + '.map');
    }

    return { outputText, sourceMap, errorDependencies };
  }

  getDependencies(fileName: string): string[] {
    const resolvedFileName = this._compilerHost.resolve(fileName);
    const sourceFile = this._compilerHost.getSourceFile(resolvedFileName, ts.ScriptTarget.Latest);
    if (!sourceFile) {
      return [];
    }

    const options = this._compilerOptions;
    const host = this._compilerHost;
    const cache = this._moduleResolutionCache;

    const esImports = collectDeepNodes<ts.ImportDeclaration>(sourceFile,
      ts.SyntaxKind.ImportDeclaration)
      .map(decl => {
        const moduleName = (decl.moduleSpecifier as ts.StringLiteral).text;
        const resolved = ts.resolveModuleName(moduleName, resolvedFileName, options, host, cache);

        if (resolved.resolvedModule) {
          return resolved.resolvedModule.resolvedFileName;
        } else {
          return null;
        }
      })
      .filter(x => x);

    const resourceImports = findResources(sourceFile)
      .map((resourceReplacement) => resourceReplacement.resourcePaths)
      .reduce((prev, curr) => prev.concat(curr), [])
      .map((resourcePath) => resolve(dirname(resolvedFileName), normalize(resourcePath)));

    // These paths are meant to be used by the loader so we must denormalize them.
    const uniqueDependencies =  new Set([
      ...esImports,
      ...resourceImports,
      ...this.getResourceDependencies(this._compilerHost.denormalizePath(resolvedFileName)),
    ].map((p) => p && this._compilerHost.denormalizePath(p)));

    return [...uniqueDependencies]
      .filter(x => !!x) as string[];
  }

  getResourceDependencies(fileName: string): string[] {
    return this._resourceLoader.getResourceDependencies(fileName);
  }

  // This code mostly comes from `performCompilation` in `@angular/compiler-cli`.
  // It skips the program creation because we need to use `loadNgStructureAsync()`,
  // and uses CustomTransformers.
  private _emit(sourceFiles: ts.SourceFile[]) {
    time('AngularCompilerPlugin._emit');
    const program = this._program;
    const allDiagnostics: Array<ts.Diagnostic | Diagnostic> = [];

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

        if ((this._firstRun || !this._forkTypeChecker) && this._program) {
          allDiagnostics.push(...gatherDiagnostics(this._program, this._JitMode,
            'AngularCompilerPlugin._emit.ts'));
        }

        if (!hasErrors(allDiagnostics)) {
          sourceFiles.forEach((sf) => {
            const timeLabel = `AngularCompilerPlugin._emit.ts+${sf.fileName}+.emit`;
            time(timeLabel);
            emitResult = tsProgram.emit(sf, undefined, undefined, undefined,
              { before: this._transformers },
            );
            allDiagnostics.push(...emitResult.diagnostics);
            timeEnd(timeLabel);
          });
        }
      } else {
        const angularProgram = program as Program;

        // Check Angular structural diagnostics.
        time('AngularCompilerPlugin._emit.ng.getNgStructuralDiagnostics');
        allDiagnostics.push(...angularProgram.getNgStructuralDiagnostics());
        timeEnd('AngularCompilerPlugin._emit.ng.getNgStructuralDiagnostics');

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

        if ((this._firstRun || !this._forkTypeChecker) && this._program) {
          allDiagnostics.push(...gatherDiagnostics(this._program, this._JitMode,
            'AngularCompilerPlugin._emit.ng'));
        }

        if (!hasErrors(allDiagnostics)) {
          time('AngularCompilerPlugin._emit.ng.emit');
          const extractI18n = !!this._compilerOptions.i18nOutFile;
          const emitFlags = extractI18n ? EmitFlags.I18nBundle : EmitFlags.Default;
          emitResult = angularProgram.emit({
            emitFlags, customTransformers: {
              beforeTs: this._transformers,
            },
          });
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
        return (error as any)['ngSyntaxError'];  // tslint:disable-line:no-any
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
        this._program = null;
        code = UNKNOWN_ERROR_CODE;
      }
      allDiagnostics.push(
        { category: ts.DiagnosticCategory.Error, messageText: errMsg, code, source: SOURCE });
      timeEnd('AngularCompilerPlugin._emit.catch');
    }
    timeEnd('AngularCompilerPlugin._emit');

    return { program, emitResult, diagnostics: allDiagnostics };
  }

  private _validateLocale(locale: string): string | null {
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
          this._warnings.push(`AngularCompilerPlugin: Unable to load the locale data file ` +
            `"@angular/common/locales/${locale}", ` +
            `please check that "${locale}" is a valid locale id.
            If needed, you can use "registerLocaleData" manually.`);

          return null;
        }
      }
    }

    return locale;
  }
}

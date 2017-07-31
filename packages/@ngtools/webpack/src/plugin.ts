// @ignoreDep @angular/compiler-cli
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import * as SourceMap from 'source-map';

const {__NGTOOLS_PRIVATE_API_2} = require('@angular/compiler-cli');
const ContextElementDependency = require('webpack/lib/dependencies/ContextElementDependency');

import {WebpackResourceLoader} from './resource_loader';
import {WebpackCompilerHost} from './compiler_host';
import {resolveEntryModuleFromMain} from './entry_resolver';
import {Tapable} from './webpack';
import {PathsPlugin} from './paths-plugin';
import {findLazyRoutes, LazyRouteMap} from './lazy_routes';


/**
 * Option Constants
 */
export interface AotPluginOptions {
  tsConfigPath: string;
  basePath?: string;
  entryModule?: string;
  mainPath?: string;
  typeChecking?: boolean;
  skipCodeGeneration?: boolean;
  replaceExport?: boolean;
  hostOverrideFileSystem?: { [path: string]: string };
  hostReplacementPaths?: { [path: string]: string };
  i18nFile?: string;
  i18nFormat?: string;
  locale?: string;

  // Use tsconfig to include path globs.
  exclude?: string | string[];
  compilerOptions?: ts.CompilerOptions;
}


const inlineSourceMapRe = /\/\/# sourceMappingURL=data:application\/json;base64,([\s\S]+)$/;


export class AotPlugin implements Tapable {
  private _options: AotPluginOptions;

  private _compilerOptions: ts.CompilerOptions;
  private _angularCompilerOptions: any;
  private _program: ts.Program;
  private _rootFilePath: string[];
  private _compilerHost: WebpackCompilerHost;
  private _resourceLoader: WebpackResourceLoader;
  private _discoveredLazyRoutes: LazyRouteMap;
  private _lazyRoutes: LazyRouteMap = Object.create(null);
  private _tsConfigPath: string;
  private _entryModule: string;

  private _donePromise: Promise<void>;
  private _compiler: any = null;
  private _compilation: any = null;

  private _typeCheck = true;
  private _skipCodeGeneration = false;
  private _replaceExport = false;
  private _basePath: string;
  private _genDir: string;

  private _i18nFile: string;
  private _i18nFormat: string;
  private _locale: string;

  private _diagnoseFiles: { [path: string]: boolean } = {};
  private _firstRun = true;

  constructor(options: AotPluginOptions) {
    this._options = Object.assign({}, options);
    this._setupOptions(this._options);
  }

  get options() { return this._options; }
  get basePath() { return this._basePath; }
  get compilation() { return this._compilation; }
  get compilerHost() { return this._compilerHost; }
  get compilerOptions() { return this._compilerOptions; }
  get done() { return this._donePromise; }
  get entryModule() {
    const splitted = this._entryModule.split('#');
    const path = splitted[0];
    const className = splitted[1] || 'default';
    return {path, className};
  }
  get genDir() { return this._genDir; }
  get program() { return this._program; }
  get skipCodeGeneration() { return this._skipCodeGeneration; }
  get replaceExport() { return this._replaceExport; }
  get typeCheck() { return this._typeCheck; }
  get i18nFile() { return this._i18nFile; }
  get i18nFormat() { return this._i18nFormat; }
  get locale() { return this._locale; }
  get firstRun() { return this._firstRun; }
  get lazyRoutes() { return this._lazyRoutes; }
  get discoveredLazyRoutes() { return this._discoveredLazyRoutes; }

  private _setupOptions(options: AotPluginOptions) {
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

    const configResult = ts.readConfigFile(this._tsConfigPath, ts.sys.readFile);
    if (configResult.error) {
      const diagnostic = configResult.error;
      const {line, character} = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      throw new Error(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message})`);
    }

    const tsConfigJson = configResult.config;

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

    const tsConfig = ts.parseJsonConfigFileContent(
      tsConfigJson, ts.sys, basePath, null, this._tsConfigPath);

    let fileNames = tsConfig.fileNames;
    this._rootFilePath = fileNames;

    // Check the genDir. We generate a default gendir that's under basepath; it will generate
    // a `node_modules` directory and because of that we don't want TypeScript resolution to
    // resolve to that directory but the real `node_modules`.
    let genDir = path.join(basePath, '$$_gendir');

    this._compilerOptions = tsConfig.options;
    this._angularCompilerOptions = Object.assign(
      { genDir },
      this._compilerOptions,
      tsConfig.raw['angularCompilerOptions'],
      { basePath }
    );

    if (this._angularCompilerOptions.hasOwnProperty('genDir')) {
      genDir = path.resolve(basePath, this._angularCompilerOptions.genDir);
      this._angularCompilerOptions.genDir = genDir;
    }

    this._basePath = basePath;
    this._genDir = genDir;

    if (options.hasOwnProperty('typeChecking')) {
      this._typeCheck = options.typeChecking;
    }
    if (options.hasOwnProperty('skipCodeGeneration')) {
      this._skipCodeGeneration = options.skipCodeGeneration;
    }

    this._compilerHost = new WebpackCompilerHost(this._compilerOptions, this._basePath);

    // Override some files in the FileSystem.
    if (options.hasOwnProperty('hostOverrideFileSystem')) {
      for (const filePath of Object.keys(options.hostOverrideFileSystem)) {
        this._compilerHost.writeFile(filePath, options.hostOverrideFileSystem[filePath], false);
      }
    }
    // Override some files in the FileSystem with paths from the actual file system.
    if (options.hasOwnProperty('hostReplacementPaths')) {
      for (const filePath of Object.keys(options.hostReplacementPaths)) {
        const replacementFilePath = options.hostReplacementPaths[filePath];
        const content = this._compilerHost.readFile(replacementFilePath);
        this._compilerHost.writeFile(filePath, content, false);
      }
    }

    this._program = ts.createProgram(
      this._rootFilePath, this._compilerOptions, this._compilerHost);

    // We enable caching of the filesystem in compilerHost _after_ the program has been created,
    // because we don't want SourceFile instances to be cached past this point.
    this._compilerHost.enableCaching();

    if (options.entryModule) {
      this._entryModule = options.entryModule;
    } else if ((tsConfig.raw['angularCompilerOptions'] as any)
            && (tsConfig.raw['angularCompilerOptions'] as any).entryModule) {
      this._entryModule = path.resolve(this._basePath,
        (tsConfig.raw['angularCompilerOptions'] as any).entryModule);
    }

    // still no _entryModule? => try to resolve from mainPath
    if (!this._entryModule && options.mainPath) {
      const mainPath = path.resolve(basePath, options.mainPath);
      this._entryModule = resolveEntryModuleFromMain(mainPath, this._compilerHost, this._program);
    }

    if (options.hasOwnProperty('i18nFile')) {
      this._i18nFile = options.i18nFile;
    }
    if (options.hasOwnProperty('i18nFormat')) {
      this._i18nFormat = options.i18nFormat;
    }
    if (options.hasOwnProperty('locale')) {
      this._locale = options.locale;
    }
    if (options.hasOwnProperty('replaceExport')) {
      this._replaceExport = options.replaceExport || this._replaceExport;
    }
  }

  private _findLazyRoutesInAst(): LazyRouteMap {
    const result: LazyRouteMap = Object.create(null);
    const changedFilePaths = this._compilerHost.getChangedFilePaths();
    for (const filePath of changedFilePaths) {
      const fileLazyRoutes = findLazyRoutes(filePath, this._program, this._compilerHost);
      for (const routeKey of Object.keys(fileLazyRoutes)) {
        const route = fileLazyRoutes[routeKey];
        if (routeKey in this._lazyRoutes) {
          if (route === null) {
            this._lazyRoutes[routeKey] = null;
          } else if (this._lazyRoutes[routeKey] !== route) {
            this._compilation.warnings.push(
              new Error(`Duplicated path in loadChildren detected during a rebuild. `
                + `We will take the latest version detected and override it to save rebuild time. `
                + `You should perform a full build to validate that your routes don't overlap.`)
            );
          }
        } else {
          result[routeKey] = route;
        }
      }
    }
    return result;
  }

  private _getLazyRoutesFromNgtools() {
    try {
      return __NGTOOLS_PRIVATE_API_2.listLazyRoutes({
        program: this._program,
        host: this._compilerHost,
        angularCompilerOptions: this._angularCompilerOptions,
        entryModule: this._entryModule
      });
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

  // registration hook for webpack plugin
  apply(compiler: any) {
    this._compiler = compiler;

    compiler.plugin('invalid', () => {
      // Turn this off as soon as a file becomes invalid and we're about to start a rebuild.
      this._firstRun = false;
      this._diagnoseFiles = {};

      if (compiler.watchFileSystem.watcher) {
        compiler.watchFileSystem.watcher.once('aggregated', (changes: string[]) => {
          changes.forEach((fileName: string) => this._compilerHost.invalidate(fileName));
        });
      }
    });

    // Add lazy modules to the context module for @angular/core/src/linker
    compiler.plugin('context-module-factory', (cmf: any) => {
      const angularCorePackagePath = require.resolve('@angular/core/package.json');
      const angularCorePackageJson = require(angularCorePackagePath);
      const angularCoreModulePath = path.resolve(path.dirname(angularCorePackagePath),
                                                 angularCorePackageJson['module']);
      // Pick the last part after the last node_modules instance. We do this to let people have
      // a linked @angular/core or cli which would not be under the same path as the project
      // being built.
      const angularCoreModuleDir = path.dirname(angularCoreModulePath).split(/node_modules/).pop();

      cmf.plugin('after-resolve', (result: any, callback: (err?: any, request?: any) => void) => {
        if (!result) {
          return callback();
        }

        // Alter only request from Angular;
        //   @angular/core/src/linker matches for 2.*.*,
        //   The other logic is for flat modules and requires reading the package.json of angular
        //     (see above).
        if (!result.resource.endsWith(path.join('@angular/core/src/linker'))
            && (angularCoreModuleDir && !result.resource.endsWith(angularCoreModuleDir))) {
          return callback(null, result);
        }

        this.done.then(() => {
          result.resource = this.skipCodeGeneration ? this.basePath : this.genDir;
          result.recursive = true;
          result.dependencies.forEach((d: any) => d.critical = false);
          result.resolveDependencies = (_fs: any, _resource: any, _recursive: any,
            _regExp: RegExp, cb: any) => {
            const dependencies = Object.keys(this._lazyRoutes)
              .map((key) => {
                const value = this._lazyRoutes[key];
                if (value !== null) {
                  return new ContextElementDependency(value, key);
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

    compiler.plugin('make', (compilation: any, cb: any) => this._make(compilation, cb));
    compiler.plugin('after-emit', (compilation: any, cb: any) => {
      this._donePromise = null;
      this._compilation = null;
      compilation._ngToolsWebpackPluginInstance = null;
      cb();
    });

    compiler.plugin('after-resolvers', (compiler: any) => {
      // Virtual file system.
      compiler.resolvers.normal.plugin('before-resolve', (request: any, cb: () => void) => {
        if (request.request.match(/\.ts$/)) {
          this.done.then(() => cb(), () => cb());
        } else {
          cb();
        }
      });
      compiler.resolvers.normal.apply(new PathsPlugin({
        tsConfigPath: this._tsConfigPath,
        compilerOptions: this._compilerOptions,
        compilerHost: this._compilerHost
      }));
    });
  }

  private _translateSourceMap(sourceText: string, fileName: string,
                              {line, character}: {line: number, character: number}) {
    const match = sourceText.match(inlineSourceMapRe);

    if (!match) {
      return {line, character, fileName};
    }

    // On any error, return line and character.
    try {
      const sourceMapJson = JSON.parse(Buffer.from(match[1], 'base64').toString());
      const consumer = new SourceMap.SourceMapConsumer(sourceMapJson);

      const original = consumer.originalPositionFor({ line, column: character });
      return {
        line: typeof original.line == 'number' ? original.line : line,
        character: typeof original.column == 'number' ? original.column : character,
        fileName: original.source || fileName
      };
    } catch (e) {
      return {line, character, fileName};
    }
  }

  diagnose(fileName: string) {
    if (this._diagnoseFiles[fileName]) {
      return;
    }
    this._diagnoseFiles[fileName] = true;

    const sourceFile = this._program.getSourceFile(fileName);
    if (!sourceFile) {
      return;
    }

    const diagnostics: ts.Diagnostic[] = []
      .concat(
        this._program.getCompilerOptions().declaration
          ? this._program.getDeclarationDiagnostics(sourceFile) : [],
        this._program.getSyntacticDiagnostics(sourceFile),
        this._program.getSemanticDiagnostics(sourceFile)
      );

    if (diagnostics.length > 0) {
      diagnostics.forEach(diagnostic => {
        const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

        const sourceText = diagnostic.file.getFullText();
        let {line, character, fileName} = this._translateSourceMap(sourceText,
          diagnostic.file.fileName, position);

        const messageText = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        const message = `${fileName} (${line + 1},${character + 1}): ${messageText}`;

        switch (diagnostic.category) {
          case ts.DiagnosticCategory.Error:
            this._compilation.errors.push(message);
            break;

          default:
            this._compilation.warnings.push(message);
        }
      });
    }
  }

  private _make(compilation: any, cb: (err?: any, request?: any) => void) {
    this._compilation = compilation;
    if (this._compilation._ngToolsWebpackPluginInstance) {
      return cb(new Error('An @ngtools/webpack plugin already exist for this compilation.'));
    }

    this._compilation._ngToolsWebpackPluginInstance = this;

    this._resourceLoader = new WebpackResourceLoader(compilation);

    this._donePromise = Promise.resolve()
      .then(() => {
        if (this._skipCodeGeneration) {
          return;
        }

        // Create the Code Generator.
        return __NGTOOLS_PRIVATE_API_2.codeGen({
          basePath: this._basePath,
          compilerOptions: this._compilerOptions,
          program: this._program,
          host: this._compilerHost,
          angularCompilerOptions: this._angularCompilerOptions,
          i18nFile: this.i18nFile,
          i18nFormat: this.i18nFormat,
          locale: this.locale,

          readResource: (path: string) => this._resourceLoader.get(path)
        });
      })
      .then(() => {
        // Get the ngfactory that were created by the previous step, and add them to the root
        // file path (if those files exists).
        const newRootFilePath = this._compilerHost.getChangedFilePaths()
          .filter(x => x.match(/\.ngfactory\.ts$/));
        // Remove files that don't exist anymore, and add new files.
        this._rootFilePath = this._rootFilePath
          .filter(x => this._compilerHost.fileExists(x))
          .concat(newRootFilePath);

        // Create a new Program, based on the old one. This will trigger a resolution of all
        // transitive modules, which include files that might just have been generated.
        // This needs to happen after the code generator has been created for generated files
        // to be properly resolved.
        this._program = ts.createProgram(
          this._rootFilePath, this._compilerOptions, this._compilerHost, this._program);
      })
      .then(() => {
        // Re-diagnose changed files.
        const changedFilePaths = this._compilerHost.getChangedFilePaths();
        changedFilePaths.forEach(filePath => this.diagnose(filePath));
      })
      .then(() => {
        if (this._typeCheck) {
          const diagnostics = this._program.getGlobalDiagnostics();
          if (diagnostics.length > 0) {
            const message = diagnostics
              .map(diagnostic => {
                const {line, character} = diagnostic.file.getLineAndCharacterOfPosition(
                  diagnostic.start);
                const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                return `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message})`;
              })
              .join('\n');

            throw new Error(message);
          }
        }
      })
      .then(() => {
        // Populate the file system cache with the virtual module.
        this._compilerHost.populateWebpackResolver(this._compiler.resolvers.normal);
      })
      .then(() => {
        // We need to run the `listLazyRoutes` the first time because it also navigates libraries
        // and other things that we might miss using the findLazyRoutesInAst.
        this._discoveredLazyRoutes = this.firstRun
          ? this._getLazyRoutesFromNgtools()
          : this._findLazyRoutesInAst();

        // Process the lazy routes discovered.
        Object.keys(this.discoveredLazyRoutes)
          .forEach(k => {
            const lazyRoute = this.discoveredLazyRoutes[k];
            k = k.split('#')[0];
            if (lazyRoute === null) {
              return;
            }

            if (this.skipCodeGeneration) {
              this._lazyRoutes[k] = lazyRoute;
            } else {
              const factoryPath = lazyRoute.replace(/(\.d)?\.ts$/, '.ngfactory.ts');
              const lr = path.relative(this.basePath, factoryPath);
              this._lazyRoutes[k + '.ngfactory'] = path.join(this.genDir, lr);
            }
          });
      })
      .then(() => {
        if (this._compilation.errors == 0) {
          this._compilerHost.resetChangedFileTracker();
        }

        cb();
      }, (err: any) => {
        compilation.errors.push(err);
        cb();
      });
  }
}

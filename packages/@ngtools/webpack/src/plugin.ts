import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import {__NGTOOLS_PRIVATE_API_2} from '@angular/compiler-cli';
import {AngularCompilerOptions} from '@angular/tsc-wrapped';

import {WebpackResourceLoader} from './resource_loader';
import {createResolveDependenciesFromContextMap} from './utils';
import {WebpackCompilerHost} from './compiler_host';
import {resolveEntryModuleFromMain} from './entry_resolver';
import {Tapable} from './webpack';
import {PathsPlugin} from './paths-plugin';


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
  i18nFile?: string;
  i18nFormat?: string;
  locale?: string;

  // Use tsconfig to include path globs.
  exclude?: string | string[];
}


export class AotPlugin implements Tapable {
  private _compilerOptions: ts.CompilerOptions;
  private _angularCompilerOptions: AngularCompilerOptions;
  private _program: ts.Program;
  private _rootFilePath: string[];
  private _compilerHost: WebpackCompilerHost;
  private _resourceLoader: WebpackResourceLoader;
  private _lazyRoutes: { [route: string]: string };
  private _tsConfigPath: string;
  private _entryModule: string;

  private _donePromise: Promise<void>;
  private _compiler: any = null;
  private _compilation: any = null;

  private _typeCheck: boolean = true;
  private _skipCodeGeneration: boolean = false;
  private _basePath: string;
  private _genDir: string;

  private _i18nFile: string;
  private _i18nFormat: string;
  private _locale: string;

  constructor(options: AotPluginOptions) {
    this._setupOptions(options);
  }

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
  get typeCheck() { return this._typeCheck; }
  get i18nFile() { return this._i18nFile; }
  get i18nFormat() { return this._i18nFormat; }
  get locale() { return this._locale; }

  private _setupOptions(options: AotPluginOptions) {
    // Fill in the missing options.
    if (!options.hasOwnProperty('tsConfigPath')) {
      throw new Error('Must specify "tsConfigPath" in the configuration of @ngtools/webpack.');
    }
    this._tsConfigPath = options.tsConfigPath;

    // Check the base path.
    const maybeBasePath = path.resolve(process.cwd(), this._tsConfigPath);
    let basePath = maybeBasePath;
    if (fs.statSync(maybeBasePath).isFile()) {
      basePath = path.dirname(basePath);
    }
    if (options.hasOwnProperty('basePath')) {
      basePath = path.resolve(process.cwd(), options.basePath);
    }

    let tsConfigJson: any = null;
    try {
      tsConfigJson = JSON.parse(fs.readFileSync(this._tsConfigPath, 'utf8'));
    } catch (err) {
      throw new Error(`An error happened while parsing ${this._tsConfigPath} JSON: ${err}.`);
    }
    const tsConfig = ts.parseJsonConfigFileContent(
      tsConfigJson, ts.sys, basePath, null, this._tsConfigPath);

    let fileNames = tsConfig.fileNames;
    if (options.hasOwnProperty('exclude')) {
      let exclude: string[] = typeof options.exclude == 'string'
          ? [options.exclude as string] : (options.exclude as string[]);

      exclude.forEach((pattern: string) => {
        const basePathPattern = '(' + basePath.replace(/\\/g, '/')
            .replace(/[\-\[\]\/{}()+?.\\^$|*]/g, '\\$&') + ')?';
        pattern = pattern
          // Replace windows path separators with forward slashes.
          .replace(/\\/g, '/')
          // Escape characters that are used normally in regexes, except stars.
          .replace(/[\-\[\]{}()+?.\\^$|]/g, '\\$&')
          // Two stars replacement.
          .replace(/\*\*/g, '(?:.*)')
          // One star replacement.
          .replace(/\*/g, '(?:[^/]*)')
          // Escape characters from the basePath and make sure it's forward slashes.
          .replace(/^/, basePathPattern);

        const re = new RegExp('^' + pattern + '$');
        fileNames = fileNames.filter(x => !x.replace(/\\/g, '/').match(re));
      });
    } else {
      fileNames = fileNames.filter(fileName => !/\.spec\.ts$/.test(fileName));
    }
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
    this._program = ts.createProgram(
      this._rootFilePath, this._compilerOptions, this._compilerHost);

    if (options.entryModule) {
      this._entryModule = options.entryModule;
    } else {
      if (options.mainPath) {
        this._entryModule = resolveEntryModuleFromMain(options.mainPath, this._compilerHost,
          this._program);
      } else {
        this._entryModule = (tsConfig.raw['angularCompilerOptions'] as any).entryModule;
      }
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
  }

  // registration hook for webpack plugin
  apply(compiler: any) {
    this._compiler = compiler;

    compiler.plugin('context-module-factory', (cmf: any) => {
      cmf.plugin('before-resolve', (request: any, callback: (err?: any, request?: any) => void) => {
        if (!request) {
          return callback();
        }

        request.request = this.skipCodeGeneration ? this.basePath : this.genDir;
        request.recursive = true;
        request.dependencies.forEach((d: any) => d.critical = false);
        return callback(null, request);
      });
      cmf.plugin('after-resolve', (result: any, callback: (err?: any, request?: any) => void) => {
        if (!result) {
          return callback();
        }

        this.done.then(() => {
          result.resource = this.skipCodeGeneration ? this.basePath : this.genDir;
          result.recursive = true;
          result.dependencies.forEach((d: any) => d.critical = false);
          result.resolveDependencies = createResolveDependenciesFromContextMap(
            (_: any, cb: any) => cb(null, this._lazyRoutes));

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
        // Create a new Program, based on the old one. This will trigger a resolution of all
        // transitive modules, which include files that might just have been generated.
        // This needs to happen after the code generator has been created for generated files
        // to be properly resolved.
        this._program = ts.createProgram(
          this._rootFilePath, this._compilerOptions, this._compilerHost, this._program);
      })
      .then(() => {
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
      })
      .then(() => {
        // Populate the file system cache with the virtual module.
        this._compilerHost.populateWebpackResolver(this._compiler.resolvers.normal);
      })
      .then(() => {
        // Process the lazy routes
        this._lazyRoutes = {};
        const allLazyRoutes = __NGTOOLS_PRIVATE_API_2.listLazyRoutes({
          program: this._program,
          host: this._compilerHost,
          angularCompilerOptions: this._angularCompilerOptions,
          entryModule: this._entryModule
        });
        Object.keys(allLazyRoutes)
          .forEach(k => {
            const lazyRoute = allLazyRoutes[k];
            k = k.split('#')[0];
            if (this.skipCodeGeneration) {
              this._lazyRoutes[k] = lazyRoute;
            } else {
              const lr = path.relative(this.basePath, lazyRoute.replace(/\.ts$/, '.ngfactory.ts'));
              this._lazyRoutes[k + '.ngfactory'] = path.join(this.genDir, lr);
            }
          });
      })
      .then(() => cb(), (err: any) => {
        compilation.errors.push(err);
        cb();
      });
  }
}

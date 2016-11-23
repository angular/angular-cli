import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import {NgModule} from '@angular/core';
import * as ngCompiler from '@angular/compiler-cli';
import {tsc} from '@angular/tsc-wrapped/src/tsc';

import {patchReflectorHost} from './reflector_host';
import {WebpackResourceLoader} from './resource_loader';
import {createResolveDependenciesFromContextMap} from './utils';
import {WebpackCompilerHost} from './compiler_host';
import {resolveEntryModuleFromMain} from './entry_resolver';
import {StaticSymbol} from '@angular/compiler-cli';
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
}


export interface LazyRoute {
  moduleRoute: ModuleRoute;
  moduleRelativePath: string;
  moduleAbsolutePath: string;
}


export interface LazyRouteMap {
  [path: string]: LazyRoute;
}


export class ModuleRoute {
  constructor(public readonly path: string, public readonly className: string = null) {}

  toString() {
    return `${this.path}#${this.className}`;
  }

  static fromString(entry: string): ModuleRoute {
    const split = entry.split('#');
    return new ModuleRoute(split[0], split[1]);
  }
}


export class AotPlugin implements Tapable {
  private _entryModule: ModuleRoute;
  private _compilerOptions: ts.CompilerOptions;
  private _angularCompilerOptions: ngCompiler.AngularCompilerOptions;
  private _program: ts.Program;
  private _reflector: ngCompiler.StaticReflector;
  private _reflectorHost: ngCompiler.ReflectorHost;
  private _rootFilePath: string[];
  private _compilerHost: WebpackCompilerHost;
  private _resourceLoader: WebpackResourceLoader;
  private _lazyRoutes: { [route: string]: string };
  private _tsConfigPath: string;

  private _donePromise: Promise<void>;
  private _compiler: any = null;
  private _compilation: any = null;

  private _typeCheck: boolean = true;
  private _skipCodeGeneration: boolean = false;
  private _basePath: string;
  private _genDir: string;


  constructor(options: AotPluginOptions) {
    this._setupOptions(options);
  }

  get basePath() { return this._basePath; }
  get compilation() { return this._compilation; }
  get compilerHost() { return this._compilerHost; }
  get compilerOptions() { return this._compilerOptions; }
  get done() { return this._donePromise; }
  get entryModule() { return this._entryModule; }
  get genDir() { return this._genDir; }
  get program() { return this._program; }
  get skipCodeGeneration() { return this._skipCodeGeneration; }
  get typeCheck() { return this._typeCheck; }

  private _setupOptions(options: AotPluginOptions) {
    // Fill in the missing options.
    if (!options.hasOwnProperty('tsConfigPath')) {
      throw new Error('Must specify "tsConfigPath" in the configuration of @ngtools/webpack.');
    }
    this._tsConfigPath = options.tsConfigPath;

    // Check the base path.
    let basePath = path.resolve(process.cwd(), path.dirname(this._tsConfigPath));
    if (fs.statSync(this._tsConfigPath).isDirectory()) {
      basePath = this._tsConfigPath;
    }
    if (options.hasOwnProperty('basePath')) {
      basePath = options.basePath;
    }

    const tsConfig = tsc.readConfiguration(this._tsConfigPath, basePath);
    this._rootFilePath = tsConfig.parsed.fileNames
      .filter(fileName => !/\.spec\.ts$/.test(fileName));

    // Check the genDir.
    let genDir = basePath;
    if (tsConfig.ngOptions.hasOwnProperty('genDir')) {
      genDir = tsConfig.ngOptions.genDir;
    }

    this._compilerOptions = tsConfig.parsed.options;

    if (options.entryModule) {
      this._entryModule = ModuleRoute.fromString(options.entryModule);
    } else {
      if (options.mainPath) {
        this._entryModule = ModuleRoute.fromString(resolveEntryModuleFromMain(options.mainPath));
      } else {
        this._entryModule = ModuleRoute.fromString((tsConfig.ngOptions as any).entryModule);
      }
    }
    this._angularCompilerOptions = Object.assign({}, tsConfig.ngOptions, {
      basePath,
      entryModule: this._entryModule.toString(),
      genDir
    });
    this._basePath = basePath;
    this._genDir = genDir;

    if (options.hasOwnProperty('typeChecking')) {
      this._typeCheck = options.typeChecking;
    }
    if (options.hasOwnProperty('skipCodeGeneration')) {
      this._skipCodeGeneration = options.skipCodeGeneration;
    }

    this._compilerHost = new WebpackCompilerHost(this._compilerOptions);
    this._program = ts.createProgram(
      this._rootFilePath, this._compilerOptions, this._compilerHost);
    this._reflectorHost = new ngCompiler.ReflectorHost(
      this._program, this._compilerHost, this._angularCompilerOptions);
    this._reflector = new ngCompiler.StaticReflector(this._reflectorHost);
  }

  // registration hook for webpack plugin
  apply(compiler: any) {
    this._compiler = compiler;

    compiler.plugin('context-module-factory', (cmf: any) => {
      cmf.resolvers.normal.apply(new PathsPlugin({
        tsConfigPath: this._tsConfigPath,
        compilerOptions: this._compilerOptions,
        compilerHost: this._compilerHost
      }));

      cmf.plugin('before-resolve', (request: any, callback: (err?: any, request?: any) => void) => {
        if (!request) {
          return callback();
        }

        request.request = this.genDir;
        request.recursive = true;
        request.dependencies.forEach((d: any) => d.critical = false);
        return callback(null, request);
      });
      cmf.plugin('after-resolve', (result: any, callback: (err?: any, request?: any) => void) => {
        if (!result) {
          return callback();
        }

        this.done.then(() => {
          result.resource = this.genDir;
          result.recursive = true;
          result.dependencies.forEach((d: any) => d.critical = false);
          result.resolveDependencies = createResolveDependenciesFromContextMap(
            (_: any, cb: any) => cb(null, this._lazyRoutes));

          return callback(null, result);
        }).catch((err) => callback(err));
      });
    });

    compiler.plugin('make', (compilation: any, cb: any) => this._make(compilation, cb));
    compiler.plugin('after-emit', (compilation: any, cb: any) => {
      this._donePromise = null;
      this._compilation = null;
      compilation._ngToolsWebpackPluginInstance = null;
      cb();
    });

    // Virtual file system.
    compiler.resolvers.normal.plugin('resolve', (request: any, cb?: () => void) => {
      if (request.request.match(/\.ts$/)) {
        this.done.then(() => cb());
      } else {
        cb();
      }
    });
  }

  private _make(compilation: any, cb: (err?: any, request?: any) => void) {
    this._compilation = compilation;

    if (this._compilation._ngToolsWebpackPluginInstance) {
      cb(new Error('An @ngtools/webpack plugin already exist for this compilation.'));
    }
    this._compilation._ngToolsWebpackPluginInstance = this;

    this._resourceLoader = new WebpackResourceLoader(compilation);

    const i18nOptions: ngCompiler.NgcCliOptions = {
      i18nFile: undefined,
      i18nFormat: undefined,
      locale: undefined,
      basePath: this.basePath
    };

    let promise = Promise.resolve();
    if (!this._skipCodeGeneration) {
      // Create the Code Generator.
      const codeGenerator = ngCompiler.CodeGenerator.create(
        this._angularCompilerOptions,
        i18nOptions,
        this._program,
        this._compilerHost,
        new ngCompiler.NodeReflectorHostContext(this._compilerHost),
        this._resourceLoader
      );

      // We need to temporarily patch the CodeGenerator until either it's patched or allows us
      // to pass in our own ReflectorHost.
      // TODO: remove this.
      patchReflectorHost(codeGenerator);
      promise = promise.then(() => codeGenerator.codegen({
        transitiveModules: true
      }));
    }

    this._donePromise = promise
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
        const allLazyRoutes = this._processNgModule(this._entryModule, null);
        Object.keys(allLazyRoutes)
          .forEach(k => {
            const lazyRoute = allLazyRoutes[k];
            if (this.skipCodeGeneration) {
              this._lazyRoutes[k] = lazyRoute.moduleAbsolutePath;
            } else {
              this._lazyRoutes[k + '.ngfactory'] = lazyRoute.moduleAbsolutePath + '.ngfactory.ts';
            }
          });
      })
      .then(() => cb(), (err: any) => { cb(err); });
  }

  private _resolveModulePath(module: ModuleRoute, containingFile: string) {
    if (module.path.startsWith('.')) {
      return path.join(path.dirname(containingFile), module.path);
    }
    return module.path;
  }

  private _processNgModule(module: ModuleRoute, containingFile: string | null): LazyRouteMap {
    const modulePath = containingFile ? module.path : ('./' + path.basename(module.path));
    if (containingFile === null) {
      containingFile = module.path + '.ts';
    }
    const relativeModulePath = this._resolveModulePath(module, containingFile);

    const staticSymbol = this._reflectorHost
      .findDeclaration(modulePath, module.className, containingFile);
    const entryNgModuleMetadata = this.getNgModuleMetadata(staticSymbol);
    const loadChildrenRoute: LazyRoute[] = this.extractLoadChildren(entryNgModuleMetadata)
      .map(route => {
        const mr = ModuleRoute.fromString(route);
        const relativePath = this._resolveModulePath(mr, relativeModulePath);
        const absolutePath = path.resolve(this.genDir, relativePath);
        return {
          moduleRoute: mr,
          moduleRelativePath: relativePath,
          moduleAbsolutePath: absolutePath
        };
      });
    const resultMap: LazyRouteMap = loadChildrenRoute
      .reduce((acc: LazyRouteMap, curr: LazyRoute) => {
        const key = curr.moduleRoute.path;
        if (acc[key]) {
          if (acc[key].moduleAbsolutePath != curr.moduleAbsolutePath) {
            throw new Error(`Duplicated path in loadChildren detected: "${key}" is used in 2 ` +
              'loadChildren, but they point to different modules. Webpack cannot distinguish ' +
              'between the two based on context and would fail to load the proper one.');
          }
        } else {
          acc[key] = curr;
        }
        return acc;
      }, {});

    // Also concatenate every child of child modules.
    for (const lazyRoute of loadChildrenRoute) {
      const mr = lazyRoute.moduleRoute;
      const children = this._processNgModule(mr, relativeModulePath);
      Object.keys(children).forEach(p => {
        const child = children[p];
        const key = child.moduleRoute.path;
        if (resultMap[key]) {
          if (resultMap[key].moduleAbsolutePath != child.moduleAbsolutePath) {
            throw new Error(`Duplicated path in loadChildren detected: "${key}" is used in 2 ` +
              'loadChildren, but they point to different modules. Webpack cannot distinguish ' +
              'between the two based on context and would fail to load the proper one.');
          }
        } else {
          resultMap[key] = child;
        }
      });
    }
    return resultMap;
  }

  private getNgModuleMetadata(staticSymbol: ngCompiler.StaticSymbol) {
    const ngModules = this._reflector.annotations(staticSymbol).filter(s => s instanceof NgModule);
    if (ngModules.length === 0) {
      throw new Error(`${staticSymbol.name} is not an NgModule`);
    }
    return ngModules[0];
  }

  private extractLoadChildren(ngModuleDecorator: any): any[] {
    const routes = (ngModuleDecorator.imports || []).reduce((mem: any[], m: any) => {
      return mem.concat(this.collectRoutes(m.providers));
    }, this.collectRoutes(ngModuleDecorator.providers));
    return this.collectLoadChildren(routes)
      .concat((ngModuleDecorator.imports || [])
        // Also recursively extractLoadChildren of modules we import.
        .map((staticSymbol: any) => {
          if (staticSymbol instanceof StaticSymbol) {
            const entryNgModuleMetadata = this.getNgModuleMetadata(staticSymbol);
            return this.extractLoadChildren(entryNgModuleMetadata);
          } else {
            return [];
          }
        })
        // Poor man's flat map.
        .reduce((acc: any[], i: any) => acc.concat(i), []))
      .filter(x => !!x);
  }

  private collectRoutes(providers: any[]): any[] {
    if (!providers) {
      return [];
    }
    const ROUTES = this._reflectorHost.findDeclaration(
      '@angular/router/src/router_config_loader', 'ROUTES', undefined);

    return providers.reduce((m, p) => {
      if (p.provide === ROUTES) {
        return m.concat(p.useValue);
      } else if (Array.isArray(p)) {
        return m.concat(this.collectRoutes(p));
      } else {
        return m;
      }
    }, []);
  }

  private collectLoadChildren(routes: any[]): any[] {
    if (!routes) {
      return [];
    }
    return routes.reduce((m, r) => {
      if (r.loadChildren) {
        return m.concat(r.loadChildren);
      } else if (Array.isArray(r)) {
        return m.concat(this.collectLoadChildren(r));
      } else if (r.children) {
        return m.concat(this.collectLoadChildren(r.children));
      } else {
        return m;
      }
    }, []);
  }
}

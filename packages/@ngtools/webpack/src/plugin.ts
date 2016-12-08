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
  absolutePath: string;
  absoluteGenDirPath: string;
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
    const maybeBasePath = path.resolve(process.cwd(), this._tsConfigPath);
    let basePath = maybeBasePath;
    if (fs.statSync(maybeBasePath).isFile()) {
      basePath = path.dirname(basePath);
    }
    if (options.hasOwnProperty('basePath')) {
      basePath = path.resolve(process.cwd(), options.basePath);
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

    this._angularCompilerOptions = Object.assign({}, tsConfig.ngOptions, { basePath, genDir });
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
      this._entryModule = ModuleRoute.fromString(options.entryModule);
    } else {
      if (options.mainPath) {
        const entryModuleString = resolveEntryModuleFromMain(options.mainPath, this._compilerHost,
          this._program);
        this._entryModule = ModuleRoute.fromString(entryModuleString);
      } else {
        this._entryModule = ModuleRoute.fromString((tsConfig.ngOptions as any).entryModule);
      }
    }

    this._reflectorHost = new ngCompiler.ReflectorHost(
      this._program, this._compilerHost, this._angularCompilerOptions);
    this._reflector = new ngCompiler.StaticReflector(this._reflectorHost);
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
    compiler.resolvers.normal.plugin('resolve', (request: any, cb?: (err?: any) => void) => {
      if (request.request.match(/\.ts$/)) {
        this.done
          .then(() => cb())
          .catch((err) => cb(err));
      } else {
        cb();
      }
    });
    compiler.resolvers.normal.apply(new PathsPlugin({
      tsConfigPath: this._tsConfigPath,
      compilerOptions: this._compilerOptions,
      compilerHost: this._compilerHost
    }));
  }

  private _make(compilation: any, cb: (err?: any, request?: any) => void) {
    this._compilation = compilation;
    if (this._compilation._ngToolsWebpackPluginInstance) {
      return cb(new Error('An @ngtools/webpack plugin already exist for this compilation.'));
    }
    this._compilation._ngToolsWebpackPluginInstance = this;

    this._resourceLoader = new WebpackResourceLoader(compilation);

    const i18nOptions: ngCompiler.NgcCliOptions = {
      i18nFile: undefined,
      i18nFormat: undefined,
      locale: undefined,
      basePath: this.basePath
    };

    this._donePromise = Promise.resolve()
      .then(() => {
        if (this._skipCodeGeneration) {
          return;
        }

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
        return codeGenerator.codegen({ transitiveModules: true });
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
        const allLazyRoutes = this._processNgModule(this._entryModule, null);
        Object.keys(allLazyRoutes)
          .forEach(k => {
            const lazyRoute = allLazyRoutes[k];
            if (this.skipCodeGeneration) {
              this._lazyRoutes[k] = lazyRoute.absolutePath + '.ts';
            } else {
              this._lazyRoutes[k + '.ngfactory'] = lazyRoute.absoluteGenDirPath + '.ngfactory.ts';
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
        const moduleRoute = ModuleRoute.fromString(route);
        const resolvedModule = ts.resolveModuleName(moduleRoute.path,
          relativeModulePath, this._compilerOptions, this._compilerHost);

        if (!resolvedModule.resolvedModule) {
          throw new Error(`Could not resolve route "${route}" from file "${relativeModulePath}".`);
        }

        const relativePath = path.relative(this.basePath,
          resolvedModule.resolvedModule.resolvedFileName).replace(/\.ts$/, '');

        const absolutePath = path.join(this.basePath, relativePath);
        const absoluteGenDirPath = path.join(this._genDir, relativePath);

        return {
          moduleRoute,
          absoluteGenDirPath,
          absolutePath
        };
      });
    const resultMap: LazyRouteMap = loadChildrenRoute
      .reduce((acc: LazyRouteMap, curr: LazyRoute) => {
        const key = curr.moduleRoute.path;
        if (acc[key]) {
          if (acc[key].absolutePath != curr.absolutePath) {
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
          if (resultMap[key].absolutePath != child.absolutePath) {
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

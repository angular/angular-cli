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


/**
 * Option Constants
 */
export interface AotPluginOptions {
  tsConfigPath: string;
  basePath?: string;
  entryModule?: string;
  genDir?: string;
  mainPath?: string;
  typeChecking?: boolean;
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


export class AotPlugin {
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

  private _donePromise: Promise<void>;
  private _compiler: any = null;
  private _compilation: any = null;

  private _typeCheck: boolean = true;


  constructor(options: AotPluginOptions) {
    this._setupOptions(options);
  }

  get basePath() { return this._angularCompilerOptions.basePath; }
  get compilation() { return this._compilation; }
  get compilerOptions() { return this._compilerOptions; }
  get done() { return this._donePromise; }
  get entryModule() { return this._entryModule; }
  get genDir() { return this._angularCompilerOptions.genDir; }
  get program() { return this._program; }
  get typeCheck() { return this._typeCheck; }

  private _setupOptions(options: AotPluginOptions) {
    // Fill in the missing options.
    if (!options.hasOwnProperty('tsConfigPath')) {
      throw new Error('Must specify "tsConfigPath" in the configuration of @ngtools/webpack.');
}

    // Check the base path.
    let basePath = path.resolve(process.cwd(), path.dirname(options.tsConfigPath));
    if (fs.statSync(options.tsConfigPath).isDirectory()) {
      basePath = options.tsConfigPath;
    }
    if (options.hasOwnProperty('basePath')) {
      basePath = options.basePath;
    }

    const tsConfig = tsc.readConfiguration(options.tsConfigPath, basePath);
    this._rootFilePath = tsConfig.parsed.fileNames;

    // Check the genDir.
    let genDir = basePath;
    if (options.hasOwnProperty('genDir')) {
      genDir = options.genDir;
    } else if (tsConfig.ngOptions.hasOwnProperty('genDir')) {
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

    if (options.hasOwnProperty('typeChecking')) {
      this._typeCheck = options.typeChecking;
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
      cmf.plugin('before-resolve', (request: any, callback: (err?: any, request?: any) => void) => {
        if (!request) {
          return callback();
        }

        request.request = this.genDir;
        request.recursive =  true;
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
        });
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
      // Populate the file system cache with the virtual module.
      this._compilerHost.populateWebpackResolver(compiler.resolvers.normal);
      if (cb) {
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
    patchReflectorHost(codeGenerator);
    this._donePromise = codeGenerator.codegen()
      .then(() => {
        // Create a new Program, based on the old one. This will trigger a resolution of all
        // transitive modules, which include files that might just have been generated.
        this._program = ts.createProgram(
          this._rootFilePath, this._compilerOptions, this._compilerHost, this._program);

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
        // Process the lazy routes
        this._lazyRoutes =
          this._processNgModule(this._entryModule, null)
            .map(module => ModuleRoute.fromString(module))
            .reduce((lazyRoutes: any, module: ModuleRoute) => {
              lazyRoutes[`${module.path}.ngfactory`] = path.join(
                this.genDir, module.path + '.ngfactory.ts');
          return lazyRoutes;
        }, {});
      })
      .then(() => cb(), (err) => cb(err));
  }

  private _resolveModule(module: ModuleRoute, containingFile: string) {
    if (module.path.startsWith('.')) {
      return path.join(path.dirname(containingFile), module.path);
    }
    return module.path;
  }

  private _processNgModule(module: ModuleRoute, containingFile: string | null): string[] {
    const modulePath = containingFile ? module.path : ('./' + path.basename(module.path));
    if (containingFile === null) {
      containingFile = module.path + '.ts';
    }

    const resolvedModulePath = this._resolveModule(module, containingFile);
    const staticSymbol = this._reflectorHost
      .findDeclaration(modulePath, module.className, containingFile);
    const entryNgModuleMetadata = this.getNgModuleMetadata(staticSymbol);
    const loadChildren = this.extractLoadChildren(entryNgModuleMetadata);
    const result = loadChildren.map(route => {
      return this._resolveModule(new ModuleRoute(route), resolvedModulePath);
    });

    // Also concatenate every child of child modules.
    for (const route of loadChildren) {
      const childModule = ModuleRoute.fromString(route);
      const children = this._processNgModule(childModule, resolvedModulePath + '.ts');
      result.push(...children);
    }
    return result;
  }

  private getNgModuleMetadata(staticSymbol: ngCompiler.StaticSymbol) {
    const ngModules = this._reflector.annotations(staticSymbol).filter(s => s instanceof NgModule);
    if (ngModules.length === 0) {
      throw new Error(`${staticSymbol.name} is not an NgModule`);
    }
    return ngModules[0];
  }

  private extractLoadChildren(ngModuleDecorator: any): any[] {
    const routes = ngModuleDecorator.imports.reduce((mem: any[], m: any) => {
      return mem.concat(this.collectRoutes(m.providers));
    }, this.collectRoutes(ngModuleDecorator.providers));
    return this.collectLoadChildren(routes);
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

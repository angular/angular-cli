//@angular/webpack plugin main
import 'reflect-metadata';
import { ReflectiveInjector, OpaqueToken, NgModule } from '@angular/core'
import * as ts from 'typescript'
import * as ngCompiler from '@angular/compiler-cli'
import * as tscWrapped from '@angular/tsc-wrapped'
import * as tsc from '@angular/tsc-wrapped/src/tsc'
import * as path from 'path'
import * as fs from 'fs'

import { WebpackResourceLoader } from './resource_loader'
import { createCodeGenerator } from './codegen'
import { createCompilerHost } from './compiler'

import * as utils from './utils'
var ContextElementDependency = require('../test/node_modules/webpack/lib/dependencies/ContextElementDependency');

function debug(...args) {
  console.log.apply(console, ['ngc:', ...args]);
}

const lazyRoutes = {
  './lazy.module.ngfactory': '/Users/robwormald/Dev/angular/angular-cli/packages/webpack/test/app/ngfactory/app/lazy.module.ngfactory.ts'
}


/**
 * Option Constants
 */
export type NGC_COMPILER_MODE = 'aot' | 'jit'




export interface AngularWebpackPluginOptions {
  tsconfigPath?: string;
  compilerMode?: NGC_COMPILER_MODE;
  providers?: any[];
  entryModule: string;
}


const noTransformExtensions = ['.html', '.css']

export class NgcWebpackPlugin {
  projectPath: string;
  rootModule: string;
  rootModuleName: string;
  fileCache: any;
  codeGeneratorFactory: any;
  reflector: ngCompiler.StaticReflector;
  reflectorHost: ngCompiler.ReflectorHost;
  program: ts.Program;
  private injector: ReflectiveInjector;
  compilerHost: ts.CompilerHost;
  compilerOptions: ts.CompilerOptions;
  angularCompilerOptions: any;
  files: any[];
  contextRegex = /.*/

  constructor(public options: any = {}) {
    const tsConfig = tsc.tsc.readConfiguration(options.project, options.baseDir);
    this.compilerOptions = tsConfig.parsed.options;
    this.files = tsConfig.parsed.fileNames;
    this.angularCompilerOptions = tsConfig.ngOptions;
    this.angularCompilerOptions.basePath = options.baseDir || process.cwd();

    if (!this.angularCompilerOptions) {
      //TODO:robwormald more validation here
      throw new Error(`"angularCompilerOptions" is not set in your tsconfig file!`);
    }
    const [rootModule, rootNgModule] = this.angularCompilerOptions.entryModule.split('#');

    this.projectPath = options.project;
    this.rootModule = rootModule;
    this.rootModuleName = rootNgModule;

    this.compilerHost = ts.createCompilerHost(this.compilerOptions, true);
    this.program = ts.createProgram(this.files, this.compilerOptions, this.compilerHost);

    //TODO: pick this up from ngOptions
    const i18nOptions = {
      i18nFile: undefined,
      i18nFormat: undefined,
      locale: undefined,
      basePath: options.baseDir
    }

    this.reflectorHost = new ngCompiler.ReflectorHost(this.program, this.compilerHost, tsConfig.ngOptions);
    this.reflector = new ngCompiler.StaticReflector(this.reflectorHost);
    this.codeGeneratorFactory = createCodeGenerator({ ngcOptions: tsConfig.ngOptions, i18nOptions, compilerHost: this.compilerHost, resourceLoader: undefined });
  }

  _configureCompiler(compiler){

  }

  //registration hook for webpack plugin
  apply(compiler) {
    compiler.plugin('context-module-factory', (cmf) => this._resolveImports(cmf));
    compiler.plugin('compile', (params) => this._compile(params))
    compiler.plugin('make', (compiler, cb) => this._make(compiler, cb));

  }

  private _resolveImports(contextModuleFactory){
    const plugin = this;
    contextModuleFactory.plugin('before-resolve', function(request, callback) {plugin._beforeResolveImports(request, callback) });
    contextModuleFactory.plugin('after-resolve', function(request, callback) { plugin._afterResolveImports(request, callback) }) ;
    return contextModuleFactory;
}

  private _beforeResolveImports(result, callback){
    if(!result) return callback();
    if(this.contextRegex.test(result.request)){
      result.request = path.resolve(process.cwd(), 'app/ngfactory');
      result.recursive =  lazyRoutes;
      result.dependencies.forEach(d => d.critical = false);

    }
    return callback(null, result);
  }

  private _afterResolveImports(result, callback){
    if(!result) return callback();
		if(this.contextRegex.test(result.resource)) {
      result.resource = path.resolve(process.cwd(), 'app/ngfactory')
      result.recursive = true;
      result.dependencies.forEach(d => d.critical = false);
      result.resolveDependencies = createResolveDependenciesFromContextMap(function(fs, cb) {
			  cb(null, lazyRoutes)
		  })
    }
    return callback(null, result);
  }

  private _make(compilation, cb) {

    const rootModulePath = this.rootModule + '.ts';
    const rootModuleName = this.rootModuleName;
    //process the lazy routes
    const lazyRoutes = this._processNgModule("./" + rootModulePath, rootModuleName, "./" + rootModulePath);

    const entryModules = lazyRoutes.map(lazyPath => lazyPath.split('#')).map(([modulePath, moduleName]) => moduleName + '.ts')

    const program = ts.createProgram(this.files, this.compilerOptions, this.compilerHost)

    this.codeGeneratorFactory(program)
      .forEach(generatedFile => {
        //debug('generated', generatedFile.fileName);
      })
      .then(
        _ => cb(),
        err => cb(err)
      );
  }

  private _processNgModule(mod: string, ngModuleName: string, containingFile: string): string[] {
    const staticSymbol = this.reflectorHost.findDeclaration(mod, ngModuleName, containingFile);
    const entryNgModuleMetadata = this.getNgModuleMetadata(staticSymbol);
    const loadChildren = this.extractLoadChildren(entryNgModuleMetadata);

    const moduleChildren = loadChildren.reduce((res, lc) => {
      const [childMoudle, childNgModule] = lc.split('#');

      //TODO calculate a different containingFile for relative paths

      const children = this._processNgModule(childMoudle, childNgModule, containingFile);
      return res.concat(children);
    }, loadChildren);

    return moduleChildren;
  }

  private _convertToModule(s: string): string {
    // TODO. Currently we assume that the string is the same as the import
    return s;
  }

  private _resolve(compiler, resolver, requestObject, cb) {
    cb()
  }


  private _run(compiler, cb) {
    cb()
  }

  private _watch(watcher, cb) {
    this._make(watcher.compiler, cb);
  }

  private _readConfig(tsConfigPath): any {
    let {config, error} = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
    if (error) {
      throw error;
    }
    return ts.parseJsonConfigFileContent(config, new ParseConfigHost(), "");
  }

  private _compile(params) {


    //console.log(params)
    // params.resolvers.normal.fileSystem = this.fileCache;
    // params.resolvers.context.fileSystem = this.fileCache;
    // params.resolvers.loader.fileSystem = this.fileCache;
  }

  private getNgModuleMetadata(staticSymbol: ngCompiler.StaticSymbol) {
    const ngModules = this.reflector.annotations(staticSymbol).filter(s => s instanceof NgModule);
    if (ngModules.length === 0) {
      throw new Error(`${staticSymbol.name} is not an NgModule`);
    }
    return ngModules[0];
  }

  private extractLoadChildren(ngModuleDecorator: any): any[] {
    const routes = ngModuleDecorator.imports.reduce((mem, m) => {
      return mem.concat(this.collectRoutes(m.providers));
    }, this.collectRoutes(ngModuleDecorator.providers));
    return this.collectLoadChildren(routes);
  }

  private collectRoutes(providers: any[]): any[] {
    if (!providers) return [];
    const ROUTES = this.reflectorHost.findDeclaration("@angular/router/src/router_config_loader", "ROUTES", undefined);
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
    if (!routes) return [];
    return routes.reduce((m, r) => {
      if (r.loadChildren) {
        return m.concat([r.loadChildren]);

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

class ParseConfigHost implements ts.ParseConfigHost {
  useCaseSensitiveFileNames: boolean = true;

  readDirectory(rootDir: string, extensions: string[], excludes: string[], includes: string[]): string[] {
    return ts.sys.readDirectory(rootDir, extensions, excludes, includes);
  }
  /**
    * Gets a value indicating whether the specified path exists and is a file.
    * @param path The path to test.
    */
  fileExists(path: string): boolean {
    return ts.sys.fileExists(path);
  }
}

function createResolveDependenciesFromContextMap(createContextMap) {
	return function resolveDependenciesFromContextMap(fs, resource, recursive, regExp, callback) {
		createContextMap(fs, function(err, map) {
			if(err) return callback(err);
			var dependencies = Object.keys(map).map(function(key) {
        console.log('key', key)

				let dep = new ContextElementDependency(map[key], key);

        return dep;
			});
			callback(null, dependencies);
		});
	}
};

import * as ts from 'typescript';
import * as path from 'path';

import {NgModule} from '@angular/core';
import * as ngCompiler from '@angular/compiler-cli';
import {tsc} from '@angular/tsc-wrapped/src/tsc';

import {patchReflectorHost} from './reflector_host';
import {WebpackResourceLoader} from './resource_loader';
import {createResolveDependenciesFromContextMap} from './utils';
import { AngularCompilerOptions } from '@angular/tsc-wrapped';
import {WebpackCompilerHost} from './compiler_host';
import {resolveEntryModuleFromMain} from './entry_resolver';


/**
 * Option Constants
 */
export interface AngularWebpackPluginOptions {
  tsconfigPath?: string;
  providers?: any[];
  entryModule?: string;
  project: string;
  baseDir: string;
  basePath?: string;
  genDir?: string;
  main?: string;
}


export class NgcWebpackPlugin {
  projectPath: string;
  rootModule: string;
  rootModuleName: string;
  reflector: ngCompiler.StaticReflector;
  reflectorHost: ngCompiler.ReflectorHost;
  program: ts.Program;
  compilerHost: WebpackCompilerHost;
  compilerOptions: ts.CompilerOptions;
  angularCompilerOptions: AngularCompilerOptions;
  files: any[];
  lazyRoutes: any;
  loader: any;
  genDir: string;
  entryModule: string;

  done: Promise<void>;

  nmf: any = null;
  cmf: any = null;
  compiler: any = null;
  compilation: any = null;

  constructor(public options: AngularWebpackPluginOptions) {
    const tsConfig = tsc.readConfiguration(options.project, options.baseDir);
    this.compilerOptions = tsConfig.parsed.options;
    this.files = tsConfig.parsed.fileNames;
    this.angularCompilerOptions = Object.assign({}, tsConfig.ngOptions, options);

    this.angularCompilerOptions.basePath = options.baseDir || process.cwd();
    this.genDir = this.options.genDir
               || path.resolve(process.cwd(), this.angularCompilerOptions.genDir + '/app');
    this.entryModule = options.entryModule || (this.angularCompilerOptions as any).entryModule;
    if (!options.entryModule && options.main) {
      this.entryModule = resolveEntryModuleFromMain(options.main);
    }

    const entryModule = this.entryModule;
    const [rootModule, rootNgModule] = entryModule.split('#');
    this.projectPath = options.project;
    this.rootModule = rootModule;
    this.rootModuleName = rootNgModule;
    this.compilerHost = new WebpackCompilerHost(this.compilerOptions);
    this.program = ts.createProgram(this.files, this.compilerOptions, this.compilerHost);
    this.reflectorHost = new ngCompiler.ReflectorHost(
      this.program, this.compilerHost, this.angularCompilerOptions);
    this.reflector = new ngCompiler.StaticReflector(this.reflectorHost);
  }

  // registration hook for webpack plugin
  apply(compiler: any) {
    this.compiler = compiler;
    compiler.plugin('normal-module-factory', (nmf: any) => this.nmf = nmf);
    compiler.plugin('context-module-factory', (cmf: any) => {
      this.cmf = cmf;
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
            (_: any, cb: any) => cb(null, this.lazyRoutes));

          return callback(null, result);
        });
      });
    });

    compiler.plugin('make', (compilation: any, cb: any) => this._make(compilation, cb));
    compiler.plugin('after-emit', (compilation: any, cb: any) => {
      this.done = null;
      this.compilation = null;
      compilation._ngToolsWebpackPluginInstance = null;
      cb();
    });

    // Virtual file system.
    compiler.resolvers.normal.plugin('resolve', (request: any, cb?: () => void) => {
      // Populate the file system cache with the virtual module.
      this.compilerHost.populateWebpackResolver(compiler.resolvers.normal);
      if (cb) {
        cb();
      }
    });
  }

  private _make(compilation: any, cb: (err?: any, request?: any) => void) {
    const rootModulePath = path.normalize(this.rootModule + '.ts');
    const rootModuleName = this.rootModuleName;
    this.compilation = compilation;

    if (this.compilation._ngToolsWebpackPluginInstance) {
      cb(new Error('A ngtools/webpack plugin already exist for this compilation.'));
    }
    this.compilation._ngToolsWebpackPluginInstance = this;

    this.loader = new WebpackResourceLoader(compilation);

    const i18nOptions: any = {
      i18nFile: undefined,
      i18nFormat: undefined,
      locale: undefined,
      basePath: this.options.baseDir
    };

    // Create the Code Generator.
    const codeGenerator = ngCompiler.CodeGenerator.create(
      this.angularCompilerOptions,
      i18nOptions,
      this.program,
      this.compilerHost,
      new ngCompiler.NodeReflectorHostContext(this.compilerHost),
      this.loader
    );

    // We need to temporarily patch the CodeGenerator until either it's patched or allows us
    // to pass in our own ReflectorHost.
    patchReflectorHost(codeGenerator);
    this.done = codeGenerator.codegen()
      .then(() => {
        // process the lazy routes
        const lazyModules = this._processNgModule(rootModulePath, rootModuleName, rootModulePath)
          .map(moduleKey => moduleKey.split('#')[0]);
        this.lazyRoutes = lazyModules.reduce((lazyRoutes: any, lazyModule: any) => {
          const genDir = this.genDir;
          lazyRoutes[`${lazyModule}.ngfactory`] = path.join(genDir, lazyModule + '.ngfactory.ts');
          return lazyRoutes;
        }, {});
      })
      .then(() => cb(), (err) => cb(err));
  }

  private _processNgModule(mod: string, ngModuleName: string, containingFile: string): string[] {
    const staticSymbol = this.reflectorHost.findDeclaration(mod, ngModuleName, containingFile);
    const entryNgModuleMetadata = this.getNgModuleMetadata(staticSymbol);
    const loadChildren = this.extractLoadChildren(entryNgModuleMetadata);

    return loadChildren.reduce((res, lc) => {
      const [childModule, childNgModule] = lc.split('#');

      // TODO calculate a different containingFile for relative paths

      const children = this._processNgModule(childModule, childNgModule, containingFile);
      return res.concat(children);
    }, loadChildren);
  }

  private getNgModuleMetadata(staticSymbol: ngCompiler.StaticSymbol) {
    const ngModules = this.reflector.annotations(staticSymbol).filter(s => s instanceof NgModule);
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
    const ROUTES = this.reflectorHost.findDeclaration(
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

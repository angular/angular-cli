//@angular/webpack plugin main
import 'reflect-metadata'
import {ReflectiveInjector, OpaqueToken} from '@angular/core'
import * as ts from 'typescript'
import * as ngCompiler from '@angular/compiler-cli'
import * as tscWrapped from '@angular/tsc-wrapped'
import * as path from 'path'
import * as fs from 'fs'
import {WebpackResourceLoader} from './resource_loader'
import {createCodeGenerator} from './codegen'
import * as astTools from '../../../dist/ast-tools/index'
import {createCompilerHost} from './compiler'
import * as utils from './utils'
import * as util from 'util'
import * as _ from 'lodash'

function debug(...args){
  console.log.apply(console, ['ngc:', ...args]);
}


/**
 * Option Constants
 */
export type NGC_COMPILER_MODE = 'aot' | 'jit'


export interface AngularWebpackPluginOptions {
  tsconfigPath?: string;
  compilerMode?: NGC_COMPILER_MODE;
  providers?:any[];
  entryModule: string;
}


const noTransformExtensions = ['.html', '.css']


export class NgcWebpackPlugin {
  rootModule: string;
  rootModuleName: string;
	fileCache: any;
  codeGeneratorFactory: any;
  reflector: ngCompiler.StaticReflector;
  reflectorHost: ngCompiler.ReflectorHost;
  program: ts.Program;
	private injector: ReflectiveInjector;

	constructor(public options:any = {}){

    const tsConfig = this._readConfig(options.project);
       const plugin = this;

    const ngcConfig = tsConfig.raw.angularCompilerOptions;
    if(!ngcConfig){
      throw new Error(`"angularCompilerOptions" is not set in your tsconfig file!`);
    }
    const [rootModule, rootNgModule] = ngcConfig.entryModule.split('#');

    this.rootModule = path.resolve(rootModule + '.ts');
    this.rootModuleName = rootNgModule;

    const compilerHost = createCompilerHost(tsConfig);



    //create a program that references the main JIT entry point (eg the main AppModule), as we need that reference for codegen
    this.program = ts.createProgram([path.resolve('./app/main.jit.ts')], tsConfig.options, compilerHost);

    this.program.getSourceFiles().forEach(f => console.log(f.fileName))

    //options for codegen
    const ngcOptions:ngCompiler.AngularCompilerOptions = {
			genDir: tsConfig.options.rootDir + './ngfactory',
			rootDir: tsConfig.options.rootDir,
			basePath: process.cwd(),
			skipMetadataEmit: true,
			skipDefaultLibCheck: true,
			skipTemplateCodegen: false,
			trace: true,
      strictMetadataEmit: true
    }

    //TODO:i18n setup
    const i18nOptions = {
      i18nFile: undefined,
      i18nFormat: undefined,
      locale: undefined,
      basePath: plugin.options.appRoot
    }

    const context = new ngCompiler.NodeReflectorHostContext(compilerHost);

    // this.reflector = new ngCompiler.StaticReflector(this.reflectorHost);
    this.reflectorHost = new ngCompiler.ReflectorHost(this.program, compilerHost, ngcOptions, context);

     this.codeGeneratorFactory = createCodeGenerator({ngcOptions, i18nOptions, compilerHost, resourceLoader: undefined, reflectorHostContext: context});

  }

  //registration hook for webpack plugin
  apply(compiler){
    compiler.plugin('compile', (params) => this._compile(params))
    compiler.plugin('make', (compilation, cb) => this._make(compilation, cb))
    compiler.plugin('run', (compiler, cb) => this._run(compiler, cb));
		compiler.plugin('watch-run', (compiler, cb) => this._watch(compiler, cb));
		compiler.plugin('compilation', (compilation) => this._compilation(compilation));
  }

  private _make(compilation, cb){

  //  const entryModule = this.reflectorHost.findDeclaration(this.rootModule, this.rootModuleName, undefined);
 //   const entryNgModuleMetadata = this.reflector.annotations(entryModule).pop();

    // const entryModules = entryNgModuleMetadata.imports
    //   .filter(importRec => importRec.ngModule && importRec.ngModule.name === 'RouterModule')
    //   .map(routerModule => routerModule.providers)


    // debug(`ngc: building from ${entryModule.name}`)

    this.codeGeneratorFactory(this.program)
      .forEach(v => console.log(v.fileName))
      .then(
        () => cb(),
        err => cb(err)
      )




  }

  private _resolve(compiler, resolver, requestObject, cb){
    cb()
  }


	private _run(compiler,cb){
    cb()
	}
	private _watch(watcher, cb){
   this._run(watcher.compiler, cb);
	}

  private _readConfig(tsConfigPath){
    let {config, error} = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
    let content = ts.parseJsonConfigFileContent(config, {
      useCaseSensitiveFileNames: true,
      fileExists: ts.sys.fileExists,
      readDirectory: ts.sys.readDirectory
    }, process.cwd())

    if(error){
      throw error;
    }
    return content;
  }

	private _compile(params){
    //console.log(params)
    // params.resolvers.normal.fileSystem = this.fileCache;
    // params.resolvers.context.fileSystem = this.fileCache;
    // params.resolvers.loader.fileSystem = this.fileCache;
  }
  private _compilation(compilation, ...args){

  }
}


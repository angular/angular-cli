// @ignoreDep @angular/compiler-cli
import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';

const {__NGTOOLS_PRIVATE_API_2, VERSION} = require('@angular/compiler-cli');

import {Tapable} from './webpack';
import {WebpackResourceLoader} from './resource_loader';

export interface ExtractI18nPluginOptions {
  tsConfigPath: string;
  basePath?: string;
  genDir?: string;
  i18nFormat?: string;
  locale?: string;
  outFile?: string;
  exclude?: string[];
}

export class ExtractI18nPlugin implements Tapable {
  private _resourceLoader: WebpackResourceLoader;

  private _donePromise: Promise<void>;
  private _compiler: any = null;
  private _compilation: any = null;

  private _tsConfigPath: string;
  private _basePath: string;
  private _genDir: string;
  private _rootFilePath: string[];
  private _compilerOptions: any = null;
  private _angularCompilerOptions: any = null;
  // private _compilerHost: WebpackCompilerHost;
  private _compilerHost: ts.CompilerHost;
  private _program: ts.Program;

  private _i18nFormat: string;
  private _locale: string;
  private _outFile: string;

  constructor(options: ExtractI18nPluginOptions) {
    this._setupOptions(options);
  }

  private _setupOptions(options: ExtractI18nPluginOptions) {
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

    // By default messages will be generated in basePath
    let genDir = basePath;

    if (options.hasOwnProperty('genDir')) {
      genDir = path.resolve(process.cwd(), options.genDir);
    }

    this._compilerOptions = tsConfig.options;
    this._angularCompilerOptions = Object.assign(
      { genDir },
      this._compilerOptions,
      tsConfig.raw['angularCompilerOptions'],
      { basePath }
    );

    this._basePath = basePath;
    this._genDir = genDir;

    // this._compilerHost = new WebpackCompilerHost(this._compilerOptions, this._basePath);
    this._compilerHost = ts.createCompilerHost(this._compilerOptions, true);
    this._program = ts.createProgram(
      this._rootFilePath, this._compilerOptions, this._compilerHost);

    if (options.hasOwnProperty('i18nFormat')) {
      this._i18nFormat = options.i18nFormat;
    }
    if (options.hasOwnProperty('locale')) {
      if (VERSION.major === '2') {
        console.warn("The option '--locale' is only available on the xi18n command"
          + ' starting from Angular v4, please update to a newer version.', '\n\n');
      }
      this._locale = options.locale;
    }
    if (options.hasOwnProperty('outFile')) {
      if (VERSION.major === '2') {
        console.warn("The option '--out-file' is only available on the xi18n command"
          + ' starting from Angular v4, please update to a newer version.', '\n\n');
      }
      this._outFile = options.outFile;
    }
  }

  apply(compiler: any) {
    this._compiler = compiler;

    compiler.plugin('make', (compilation: any, cb: any) => this._make(compilation, cb));

    compiler.plugin('after-emit', (compilation: any, cb: any) => {
      this._donePromise = null;
      this._compilation = null;
      compilation._ngToolsWebpackXi18nPluginInstance = null;
      cb();
    });
  }

  private _make(compilation: any, cb: (err?: any, request?: any) => void) {
    this._compilation = compilation;
    if (this._compilation._ngToolsWebpackXi18nPluginInstance) {
      return cb(new Error('An @ngtools/webpack xi18n plugin already exist for ' +
        'this compilation.'));
    }
    if (!this._compilation._ngToolsWebpackPluginInstance) {
      return cb(new Error('An @ngtools/webpack aot plugin does not exists ' +
        'for this compilation'));
    }

    this._compilation._ngToolsWebpackXi18nPluginInstance = this;

    this._resourceLoader = new WebpackResourceLoader(compilation);

    this._donePromise = Promise.resolve()
      .then(() => {
        return __NGTOOLS_PRIVATE_API_2.extractI18n({
          basePath: this._basePath,
          compilerOptions: this._compilerOptions,
          program: this._program,
          host: this._compilerHost,
          angularCompilerOptions: this._angularCompilerOptions,
          i18nFormat: this._i18nFormat || '',
          locale: this._locale,
          outFile: this._outFile,

          readResource: (path: string) => this._resourceLoader.get(path)
        });
      })
      .then(() => cb(), (err: any) => {
        this._compilation.errors.push(err);
        cb(err);
      });

  }
}

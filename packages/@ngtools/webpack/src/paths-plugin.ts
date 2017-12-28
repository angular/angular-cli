// @ignoreDep typescript
import * as path from 'path';
import * as ts from 'typescript';
import {
  ResolverPlugin,
  Callback,
  Tapable,
  NormalModuleFactory,
  NormalModuleFactoryRequest,
} from './webpack';


const ModulesInRootPlugin: new (a: string, b: string, c: string) => ResolverPlugin
  = require('enhanced-resolve/lib/ModulesInRootPlugin');

export function resolveWithPaths(
  request: NormalModuleFactoryRequest,
  callback: Callback<NormalModuleFactoryRequest>,
  compilerOptions: ts.CompilerOptions,
  host: ts.CompilerHost,
  cache?: ts.ModuleResolutionCache,
) {
  if (!request) {
    callback(null, request);
    return;
  }

  // Only work on Javascript/TypeScript issuers.
  if (!request.contextInfo.issuer || !request.contextInfo.issuer.match(/\.[jt]s$/)) {
    callback(null, request);
    return;
  }

  const moduleResolver = ts.resolveModuleName(
    request.request,
    request.contextInfo.issuer,
    compilerOptions,
    host,
    cache
  );

  let moduleFilePath = moduleResolver.resolvedModule
                    && moduleResolver.resolvedModule.resolvedFileName;

  // If TypeScript gives us a .d.ts it's probably a node module and we need to let webpack
  // do the resolution.
  if (moduleFilePath) {
    moduleFilePath = moduleFilePath.replace(/\.d\.ts$/, '.js');
    if (host.fileExists(moduleFilePath)) {
      request.request = moduleFilePath;
    }
  }

  callback(null, request);
}

export interface PathsPluginOptions {
  nmf: NormalModuleFactory;
  tsConfigPath: string;
  compilerOptions?: ts.CompilerOptions;
  compilerHost?: ts.CompilerHost;
}

export class PathsPlugin implements Tapable {
  private _nmf: NormalModuleFactory;
  private _compilerOptions: ts.CompilerOptions;
  private _host: ts.CompilerHost;

  source: string;
  target: string;
  private _absoluteBaseUrl: string;

  private static _loadOptionsFromTsConfig(tsConfigPath: string, host?: ts.CompilerHost):
      ts.CompilerOptions {
    const tsConfig = ts.readConfigFile(tsConfigPath, (path: string) => {
      if (host) {
        return host.readFile(path);
      } else {
        return ts.sys.readFile(path);
      }
    });
    if (tsConfig.error) {
      throw tsConfig.error;
    }
    return tsConfig.config.compilerOptions;
  }

  constructor(options: PathsPluginOptions) {
    if (!options.hasOwnProperty('tsConfigPath')) {
      // This could happen in JavaScript.
      throw new Error('tsConfigPath option is mandatory.');
    }
    const tsConfigPath = options.tsConfigPath;

    if (options.compilerOptions) {
      this._compilerOptions = options.compilerOptions;
    } else {
      this._compilerOptions = PathsPlugin._loadOptionsFromTsConfig(tsConfigPath);
    }

    if (options.compilerHost) {
      this._host = options.compilerHost;
    } else {
      this._host = ts.createCompilerHost(this._compilerOptions, false);
    }

    this._nmf = options.nmf;
    this.source = 'described-resolve';
    this.target = 'resolve';

    this._absoluteBaseUrl = path.resolve(
      path.dirname(tsConfigPath),
      this._compilerOptions.baseUrl || '.'
    );
  }

  apply(resolver: ResolverPlugin): void {
    let baseUrl = this._compilerOptions.baseUrl || '.';

    if (baseUrl) {
      resolver.apply(new ModulesInRootPlugin('module', this._absoluteBaseUrl, 'resolve'));
    }

    this._nmf.plugin('before-resolve', (request, callback) => {
      resolveWithPaths(request, callback, this._compilerOptions, this._host);
    });
  }
}

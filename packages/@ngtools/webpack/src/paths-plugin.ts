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

export interface Mapping {
  onlyModule: boolean;
  alias: string;
  aliasPattern: RegExp;
  target: string;
}


function escapeRegExp(str: string): string {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}


export interface PathsPluginOptions {
  nmf: NormalModuleFactory;
  tsConfigPath: string;
  compilerOptions?: ts.CompilerOptions;
  compilerHost?: ts.CompilerHost;
}

export class PathsPlugin implements Tapable {
  private _nmf: NormalModuleFactory;
  private _tsConfigPath: string;
  private _compilerOptions: ts.CompilerOptions;
  private _host: ts.CompilerHost;

  source: string;
  target: string;

  private _mappings: Mapping[];

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
    this._tsConfigPath = options.tsConfigPath;

    if (options.hasOwnProperty('compilerOptions')) {
      this._compilerOptions = Object.assign({}, options.compilerOptions);
    } else {
      this._compilerOptions = PathsPlugin._loadOptionsFromTsConfig(this._tsConfigPath, null);
    }

    if (options.hasOwnProperty('compilerHost')) {
      this._host = options.compilerHost;
    } else {
      this._host = ts.createCompilerHost(this._compilerOptions, false);
    }

    this._nmf = options.nmf;
    this.source = 'described-resolve';
    this.target = 'resolve';

    this._absoluteBaseUrl = path.resolve(
      path.dirname(this._tsConfigPath),
      this._compilerOptions.baseUrl || '.'
    );

    this._mappings = [];
    let paths = this._compilerOptions.paths || {};
    Object.keys(paths).forEach(alias => {
      let onlyModule = alias.indexOf('*') === -1;
      let excapedAlias = escapeRegExp(alias);
      let targets = paths[alias];
      targets.forEach(target => {
        let aliasPattern: RegExp;
        if (onlyModule) {
          aliasPattern = new RegExp(`^${excapedAlias}$`);
        } else {
          let withStarCapturing = excapedAlias.replace('\\*', '(.*)');
          aliasPattern = new RegExp(`^${withStarCapturing}`);
        }

        this._mappings.push({
          onlyModule,
          alias,
          aliasPattern,
          target: target
        });
      });
    });
  }

  apply(resolver: ResolverPlugin): void {
    let baseUrl = this._compilerOptions.baseUrl || '.';

    if (baseUrl) {
      resolver.apply(new ModulesInRootPlugin('module', this._absoluteBaseUrl, 'resolve'));
    }

    this._nmf.plugin('before-resolve', (request: NormalModuleFactoryRequest,
                                        callback: Callback<any>) => {
      for (let mapping of this._mappings) {
        const match = request.request.match(mapping.aliasPattern);
        if (!match) { continue; }

        let newRequestStr = mapping.target;
        if (!mapping.onlyModule) {
          newRequestStr = newRequestStr.replace('*', match[1]);
        }

        const moduleResolver: ts.ResolvedModuleWithFailedLookupLocations =
          ts.nodeModuleNameResolver(
            newRequestStr,
            this._absoluteBaseUrl,
            this._compilerOptions,
            this._host
          );
        const moduleFilePath = moduleResolver.resolvedModule ?
          moduleResolver.resolvedModule.resolvedFileName : '';

        if (moduleFilePath) {
          return callback(null, Object.assign({}, request, {
            request: moduleFilePath.includes('.d.ts') ? newRequestStr : moduleFilePath
          }));
        }
      }

      return callback(null, request);
    });
  }
}

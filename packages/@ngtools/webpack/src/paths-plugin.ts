import * as path from 'path';
import * as ts from 'typescript';
import {Request, ResolverPlugin, Callback, Tapable} from './webpack';


const ModulesInRootPlugin: new (a: string, b: string, c: string) => ResolverPlugin
  = require('enhanced-resolve/lib/ModulesInRootPlugin');

interface CreateInnerCallback {
  (callback: Callback<any>,
   options: Callback<any>,
   message?: string,
   messageOptional?: string): Callback<any>;
}

const createInnerCallback: CreateInnerCallback
  = require('enhanced-resolve/lib/createInnerCallback');
const getInnerRequest: (resolver: ResolverPlugin, request: Request) => string
  = require('enhanced-resolve/lib/getInnerRequest');


function escapeRegExp(str: string): string {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}


export interface PathsPluginOptions {
  tsConfigPath: string;
  compilerOptions?: ts.CompilerOptions;
  compilerHost?: ts.CompilerHost;
}

export class PathsPlugin implements Tapable {
  private _tsConfigPath: string;
  private _compilerOptions: ts.CompilerOptions;
  private _host: ts.CompilerHost;

  source: string;
  target: string;

  private mappings: any;

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

    this.source = 'described-resolve';
    this.target = 'resolve';

    this._absoluteBaseUrl = path.resolve(
      path.dirname(this._tsConfigPath),
      this._compilerOptions.baseUrl || '.'
    );

    this.mappings = [];
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

        this.mappings.push({
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

    this.mappings.forEach((mapping: any) => {
      resolver.plugin(this.source, this.createPlugin(resolver, mapping));
    });
  }

  resolve(resolver: ResolverPlugin, mapping: any, request: any, callback: Callback<any>): any {
    let innerRequest = getInnerRequest(resolver, request);
    if (!innerRequest) {
      return callback();
    }

    let match = innerRequest.match(mapping.aliasPattern);
    if (!match) {
      return callback();
    }

    let newRequestStr = mapping.target;
    if (!mapping.onlyModule) {
      newRequestStr = newRequestStr.replace('*', match[1]);
    }
    if (newRequestStr[0] === '.') {
      newRequestStr = path.resolve(this._absoluteBaseUrl, newRequestStr);
    }

    let newRequest = Object.assign({}, request, {
      request: newRequestStr
    }) as Request;

    return resolver.doResolve(
      this.target,
      newRequest,
      `aliased with mapping '${innerRequest}': '${mapping.alias}' to '${newRequestStr}'`,
      createInnerCallback(
        function(err, result) {
          if (arguments.length > 0) {
            return callback(err, result);
          }

          // don't allow other aliasing or raw request
          callback(null, null);
        },
        callback
      )
    );
  }

  createPlugin(resolver: ResolverPlugin, mapping: any): any {
    return (request: any, callback: Callback<any>) => {
      try {
        this.resolve(resolver, mapping, request, callback);
      } catch (err) {
        callback(err);
      }
    };
  }
}

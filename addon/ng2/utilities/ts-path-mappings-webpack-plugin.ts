import * as path from 'path';
import * as ts from 'typescript';
import * as _ from 'lodash';

const ModulesInRootPlugin: new (a: string, b: string, c: string) => ResolverPlugin = require('enhanced-resolve/lib/ModulesInRootPlugin');

const createInnerCallback: CreateInnerCallback = require('enhanced-resolve/lib/createInnerCallback');
const getInnerRequest: getInnerRequest = require('enhanced-resolve/lib/getInnerRequest');

export type ResolverCallback = (request: Request, callback: Callback) => void;
export type QueryOptions = LoaderConfig & ts.CompilerOptions;
export type TsConfig = ts.ParsedCommandLine;

export type CreateInnerCallback = (callback: Callback, options: Callback, message?: string, messageOptional?: string) => Callback;
type getInnerRequest = (resolver: Resolver, request: Request) => string;

export interface TSCompilerInfo {
    compilerPath: string;
    tsImpl: typeof ts;
}

export interface Request {
    request?: Request;
    relativePath: string;
}

export interface Callback {
    (err?: Error, result?: any): void;

    log?: any;
    stack?: any;
    missing?: any;
}

export interface Configs {
    configFilePath: string;
    compilerConfig: TsConfig;
    loaderConfig: LoaderConfig;
}

export interface LoaderConfig {
    instanceName?: string;
    showRecompileReason?: boolean;
    compiler?: string;
    emitRequireType?: boolean;
    reEmitDependentFiles?: boolean;
    tsconfig?: string;
    useWebpackText?: boolean;
    externals?: string[];
    doTypeCheck?: boolean;
    ignoreDiagnostics?: number[];
    forkChecker?: boolean;
    forkCheckerSilent?: boolean;
    useBabel?: boolean;
    babelCore?: string;
    babelOptions?: any;
    usePrecompiledFiles?: boolean;
    skipDeclarationFilesCheck?: boolean;
    useCache?: boolean;
    cacheDirectory?: string;
    resolveGlobs?: boolean;
    library: string;
}

export interface ResolverPlugin {
    apply(resolver: Resolver): void;
}

export interface Resolver {
    apply(plugin: ResolverPlugin): void;
    plugin(source: string, cb: ResolverCallback): void;
    doResolve(target: string, req: Request, desc: string, Callback: any): void;
    join(relativePath: string, innerRequest: Request): Request;
}

export interface Mapping {
    onlyModule: boolean;
    alias: string;
    aliasPattern: RegExp;
    target: string;
}

export function readConfigFile(baseDir: string, query: QueryOptions, tsImpl: typeof ts): Configs {
    let configFilePath: string;
    if (query.tsconfig && query.tsconfig.match(/\.json$/)) {
        configFilePath = path.dirname(path.resolve(process.cwd(),query.tsconfig));
    } else {
        configFilePath = tsImpl.findConfigFile(process.cwd(), tsImpl.sys.fileExists);
    }

     let existingOptions = tsImpl.convertCompilerOptionsFromJson(query, process.cwd(), 'atl.query');

    if (!configFilePath) {
        return {
            configFilePath: process.cwd(),
            compilerConfig: tsImpl.parseJsonConfigFileContent(
                {},
                tsImpl.sys,
                process.cwd(),
                _.extend({}, ts.getDefaultCompilerOptions(), existingOptions.options) as ts.CompilerOptions,
                process.cwd()
            ),
            loaderConfig: query as LoaderConfig
        };
    }

    debugger;

    let jsonConfigFile = tsImpl.readConfigFile(configFilePath, tsImpl.sys.readFile);

    let compilerConfig = tsImpl.parseJsonConfigFileContent(
        jsonConfigFile.config,
        tsImpl.sys,
        process.cwd(),
        existingOptions.options,
        configFilePath
    );

    return {
        jsonConfigFile,
        configFilePath,
        compilerConfig,
        loaderConfig: _.defaults<LoaderConfig, LoaderConfig>(
            query,
            jsonConfigFile.config.awesomeTypescriptLoaderOptions)
    };
}



export function setupTs(compiler: string): TSCompilerInfo {
    let compilerPath = compiler || 'typescript';

    let tsImpl: typeof ts;
    let tsImplPath: string;
    try {
        tsImplPath = require.resolve(compilerPath);
        tsImpl = require(tsImplPath);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }

    let compilerInfo: TSCompilerInfo = {
        compilerPath,
        tsImpl,
    };

    return compilerInfo;
}


function escapeRegExp(str: string) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

export class PathsPlugin implements ResolverPlugin {
    source: string;
    target: string;
    ts: typeof ts;
    configFilePath: string;
    options: ts.CompilerOptions;

    baseUrl: string;
    mappings: Mapping[];
    absoluteBaseUrl: string;


    constructor(config: LoaderConfig & ts.CompilerOptions = {} as any) {
        this.source = 'described-resolve';
        this.target = 'resolve';

        this.ts = setupTs(config.compiler).tsImpl;

        let { configFilePath, compilerConfig, jsonConfigFile } = readConfigFile(process.cwd(), config, this.ts);
        this.options = compilerConfig.options;
        this.configFilePath = configFilePath;

        this.baseUrl = this.options.configFilePath ? this.options.configFilePath : './';

        this.absoluteBaseUrl = path.resolve(
            path.dirname(this.configFilePath),
            this.baseUrl
        );

        this.mappings = [];
        let paths = this.options.paths || {};
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

    apply(resolver: Resolver) {
        let { baseUrl, mappings, absoluteBaseUrl } = this;

        if (baseUrl) {
            resolver.apply(new ModulesInRootPlugin("module", absoluteBaseUrl, "resolve"));
        }

        mappings.forEach(mapping => {
            // resolver.plugin(this.source, this.createPlugin(resolver, mapping));
            resolver.plugin(this.source, function(request, callback) {
              var innerRequest = getInnerRequest(resolver, request);
              if(!innerRequest) return callback();

              var newRequestStr = mapping.target;
              var match = innerRequest.match(mapping.aliasPattern);
              if (!match) {
                  return callback();
              }
              if (!mapping.onlyModule) {
                  newRequestStr = newRequestStr.replace('*', match[1]);
              }
              if (newRequestStr[0] === '.') {
                  newRequestStr = path.resolve(absoluteBaseUrl, newRequestStr);
              }
              var obj: Request = Object.assign({}, request, {
                request: newRequestStr
              });

              console.log("aliased'" + innerRequest  + "': '" + mapping.alias + "' to '" + newRequestStr + "'", newRequest);

              return resolver.doResolve(this.target, obj,"aliased with mapping '" + innerRequest  + "': '" + mapping.alias + "' to '" + newRequestStr + "'", createInnerCallback(function(err, result) {
                if(arguments.length > 0) return callback(err, result);

                // don't allow other aliasing or raw request
                callback(null, null);
              }, callback));

              return callback();
            });
        });
    }
}

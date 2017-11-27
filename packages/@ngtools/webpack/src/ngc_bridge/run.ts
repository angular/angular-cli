import * as Path from 'path';
import * as webpack from 'webpack';
import * as ts from 'typescript';
import { CompilerOptions, ParsedConfiguration, readConfiguration } from '@angular/compiler-cli';

import { createContext } from './ngc_compilation_context';
import { performCompilationAsync } from './perform_compile_async';
import { parseDiagnostics } from './util';

export interface CompilationResult {
  errors?: Error[];
  emitResult?: ts.EmitResult;
}

/**
 * Perform AOT compilation with all resources (templateUrl / styleUrls) compiled
 * by webpack using the loader chain configuration supplied.
 *
 * Inlining is automatically set on based on the typescript configuration.
 */
export function executeCompilation(
  webpackConfig: webpack.Configuration,
  config: ParsedConfiguration
): Promise<CompilationResult> {
  const compiler = webpack(webpackConfig);
  const inline = config.options.skipTemplateCodegen;
  workaroundSkipTemplateCodegen(config);

  const ctx = createContext(config);
  const { compilerHost } = ctx;

  const compilation = ctx.createCompilation(compiler);
  const rootNames = config.rootNames.slice();

  return performCompilationAsync({
    rootNames,
    options: config.options,

    /*
        The compiler host "writeFile" is wrapped with a handler that will
        inline all resources into metadata modules (non flat bundle modules)
     */
    host: (inline && !config.options.skipMetadataEmit && !config.options.flatModuleOutFile)
      ? ctx.resourceInliningCompilerHost()
      : compilerHost
    ,
    emitFlags: config.emitFlags,
    emitCallback: ctx.emitCallback,
    customTransformers: {
      beforeTs: inline ? [ ctx.createInlineResourcesTransformer() ] : []
    }
  })
    .then( result => {
      const parsedDiagnostics = parseDiagnostics(result.diagnostics, config.options);
      if (parsedDiagnostics.exitCode !== 0) {
        const error = parsedDiagnostics.error || new Error(parsedDiagnostics.exitCode.toString());
        compilation.errors.push(error);
      }

      if (compilation.errors.length === 0) {
        // inline resources into the flat metadata json file, if exists.
        if (config.options.flatModuleOutFile) {
          // we assume the last rootName is the flatModuleOutFile JS added by the compiler
          // TODO: check that it exists
          const flatModulePath = rootNames[rootNames.length - 1];
          ctx.inlineFlatModuleMetadataBundle(
            Path.dirname(flatModulePath),
            config.options.flatModuleOutFile
          );
        }

        return { emitResult: result.emitResult };
      } else {
        return { errors: compilation.errors };
      }
    });
}

/**
 * Perform AOT compilation with all resources (templateUrl / styleUrls) compiled
 * by webpack using the loader chain configuration supplied.
 *
 * Inlining is automatically set on based on the typescript configuration.
 *
 * > Note that `extOptions` has 2 properties that extend the configuration.
 * `compilerOptions` is applied before parsing the configuration and does not
 * accept values from `angularCompilerOptions`, if set they are overriden.
 * `existingOptions` is applied after parsing which means it can not effect
 * rootName, emit flags, etc...
 * @param webpackConfig Webpack configuration module, object or string,
 * @param tsConfigPath path to the tsconfig file, relative to process.cwd()
 * @param extOptions Optional TS/AOT options that extend the options loaded from file.
 * @param extOptions.compilerOptions - Optional TS compiler options set BEFORE parsing
 * @param extOptions.existingOptions - Optional compiler options set AFTER parsing
 */
export function compile(
  webpackConfig: string | webpack.Configuration,
  tsConfigPath: string,
  extOptions: { compilerOptions?: ts.CompilerOptions, existingOptions?: CompilerOptions } = {}
): Promise<CompilationResult> {

  // load tsconfig
  const config = readConfiguration(tsConfigPath, extOptions.compilerOptions);
  if (config.errors && config.errors.length > 0) {
    const parsed = parseDiagnostics(config.errors, undefined);
    return Promise.resolve({ errors: [parsed.error] });
  }
  const existingOptions = extOptions.existingOptions || <any> {};
  const options = {...config.options, ...existingOptions};

  // normalize webpackConfig input
  if (typeof webpackConfig === 'string') {
    let configPath = Path.isAbsolute(webpackConfig)
      ? webpackConfig
      : Path.join(process.cwd(), webpackConfig)
    ;
    webpackConfig = require(configPath);
  }

  return executeCompilation(resolveConfig(webpackConfig), {
    project: tsConfigPath,
    rootNames: config.rootNames,
    options,
    errors: config.errors,
    emitFlags: config.emitFlags
  });
}

/**
 * Resolve the config to an object.
 * If it's a fn, invoke.
 *
 * Also check if it's a mocked ES6 Module in cases where TS file is used that uses "export default"
 * @param config
 * @returns {any}
 */
function resolveConfig(config: any): webpack.Configuration {
  if (typeof config === 'function') {
    return config();
  } else if (config.__esModule === true && !!config.default) {
    return resolveConfig(config.default);
  } else {
    return config;
  }
}

/**
 * `compiler-cli`s compiler host will not generate metadata if skipping template codegen
 * or no full template typescheck.
 *
 * https://github.com/angular/angular/blob/master/
 * packages/compiler-cli/src/transformers/compiler_host.ts#L440
 *
 * This is required if we want to inline the resources while compiling and not post-compiling.
 *
 * To solve this we need to can force `fullTemplateTypeCheck`...
 * This is strict and might cause issues to some devs and also has an issue:
 * https://github.com/angular/angular/issues/19905
 * which has pending PR to fix: https://github.com/angular/angular/pull/20490
 *
 * Another options is to disable skipTemplateCodegen.
 * It looks counter-intuitive because we want it on... but, at this point we already have
 * a calcualted `emitFlags` which has the flag `Codegen` OFF !!!
 * OFF reflects config.options.skipTemplateCodegen = true.
 *
 * Setting `config.options.skipTemplateCodegen` to false, at this point, will not change the
 * emitFlags. The compiler will NOT emit template code gen but
 * the `isSourceFile` method will return true!
 *
 * This is a weak workaround and a more solid one is required.
 *
 * TODO: refactor workaround to a writeFile wrapper that will not write generated files.
 */
function workaroundSkipTemplateCodegen(config: ParsedConfiguration): void {
  if (config.options.skipTemplateCodegen && !config.options.fullTemplateTypeCheck) {
    // options.fullTemplateTypeCheck = true;
    config.options.skipTemplateCodegen = false;
  }
}

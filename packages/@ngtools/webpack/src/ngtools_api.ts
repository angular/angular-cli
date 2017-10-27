// @ignoreDep @angular/compiler-cli
// @ignoreDep typescript
/**
 * This is a copy of types in @compiler-cli/src/ngtools_api.d.ts file,
 * together with safe imports for private apis for cases where @angular/compiler-cli isn't
 * available or is below version 5.
 */
import * as path from 'path';
import * as ts from 'typescript';

export const DEFAULT_ERROR_CODE = 100;
export const UNKNOWN_ERROR_CODE = 500;
export const SOURCE = 'angular' as 'angular';
export interface Diagnostic {
  messageText: string;
  span?: any;
  category: ts.DiagnosticCategory;
  code: number;
  source: 'angular';
}
export interface CompilerOptions extends ts.CompilerOptions {
  basePath?: string;
  skipMetadataEmit?: boolean;
  strictMetadataEmit?: boolean;
  skipTemplateCodegen?: boolean;
  flatModuleOutFile?: string;
  flatModuleId?: string;
  generateCodeForLibraries?: boolean;
  annotateForClosureCompiler?: boolean;
  annotationsAs?: 'decorators' | 'static fields';
  trace?: boolean;
  enableLegacyTemplate?: boolean;
  disableExpressionLowering?: boolean;
  i18nOutLocale?: string;
  i18nOutFormat?: string;
  i18nOutFile?: string;
  i18nInFormat?: string;
  i18nInLocale?: string;
  i18nInFile?: string;
  i18nInMissingTranslations?: 'error' | 'warning' | 'ignore';
  preserveWhitespaces?: boolean;
}
export interface CompilerHost extends ts.CompilerHost {
  moduleNameToFileName(moduleName: string, containingFile?: string): string | null;
  fileNameToModuleName(importedFilePath: string, containingFilePath: string): string | null;
  resourceNameToFileName(resourceName: string, containingFilePath: string): string | null;
  toSummaryFileName(fileName: string, referringSrcFileName: string): string;
  fromSummaryFileName(fileName: string, referringLibFileName: string): string;
  readResource?(fileName: string): Promise<string> | string;
}
export interface CustomTransformers {
  beforeTs?: ts.TransformerFactory<ts.SourceFile>[];
  afterTs?: ts.TransformerFactory<ts.SourceFile>[];
}
export interface TsEmitArguments {
  program: ts.Program;
  host: CompilerHost;
  options: CompilerOptions;
  targetSourceFile?: ts.SourceFile;
  writeFile?: ts.WriteFileCallback;
  cancellationToken?: ts.CancellationToken;
  emitOnlyDtsFiles?: boolean;
  customTransformers?: ts.CustomTransformers;
}
export interface TsEmitCallback {
  (args: TsEmitArguments): ts.EmitResult;
}
export interface Program {
  getTsProgram(): ts.Program;
  getTsOptionDiagnostics(cancellationToken?: ts.CancellationToken): ts.Diagnostic[];
  getNgOptionDiagnostics(cancellationToken?: ts.CancellationToken): Diagnostic[];
  getTsSyntacticDiagnostics(sourceFile?: ts.SourceFile, cancellationToken?: ts.CancellationToken):
    ts.Diagnostic[];
  getNgStructuralDiagnostics(cancellationToken?: ts.CancellationToken): Diagnostic[];
  getTsSemanticDiagnostics(sourceFile?: ts.SourceFile, cancellationToken?: ts.CancellationToken):
    ts.Diagnostic[];
  getNgSemanticDiagnostics(fileName?: string, cancellationToken?: ts.CancellationToken):
    Diagnostic[];
  loadNgStructureAsync(): Promise<void>;
  listLazyRoutes?(): LazyRoute[];
  emit({ emitFlags, cancellationToken, customTransformers, emitCallback }: {
    emitFlags?: any;
    cancellationToken?: ts.CancellationToken;
    customTransformers?: CustomTransformers;
    emitCallback?: TsEmitCallback;
  }): ts.EmitResult;
}

export interface LazyRoute {
  route: string;
  module: { name: string, filePath: string };
  referencedModule: { name: string, filePath: string };
}

export declare type Diagnostics = Array<ts.Diagnostic | Diagnostic>;

// Interfaces for the function declarations.
export interface CreateProgramInterface {
  ({ rootNames, options, host, oldProgram }: {
    rootNames: string[];
    options: CompilerOptions;
    host: CompilerHost;
    oldProgram?: Program;
  }): Program;
}
export interface CreateCompilerHostInterface {
  ({ options, tsHost }: {
    options: CompilerOptions;
    tsHost?: ts.CompilerHost;
  }): CompilerHost;
}
export interface FormatDiagnosticsInterface {
  (diags: Diagnostics): string;
}
export interface ParsedConfiguration {
  project: string;
  options: CompilerOptions;
  rootNames: string[];
  emitFlags: any;
  errors: Diagnostics;
}
export interface ReadConfigurationInterface {
  (project: string, existingOptions?: ts.CompilerOptions): ParsedConfiguration;
}

// Manually check for Compiler CLI availability and supported version.
// This is needed because @ngtools/webpack does not depend directly on @angular/compiler-cli, since
// it is installed as part of global Angular CLI installs and compiler-cli is not of its
// dependencies.
export function CompilerCliIsSupported() {
  let version;

  // Check that Angular is available.
  try {
    version = require('@angular/compiler-cli').VERSION;
  } catch (e) {
    throw new Error('The "@angular/compiler-cli" package was not properly installed. Error: ' + e);
  }

  // Check that Angular is also not part of this module's node_modules (it should be the project's).
  const compilerCliPath = require.resolve('@angular/compiler-cli');
  if (compilerCliPath.startsWith(path.dirname(__dirname))) {
    throw new Error('The @ngtools/webpack plugin now relies on the project @angular/compiler-cli. '
      + 'Please clean your node_modules and reinstall.');
  }

  // Throw if we're neither 2.3.1 or more, nor 4.x.y, nor 5.x.y.
  if (!(version.major == '5'
    || version.major == '4'
    || (version.major == '2'
      && (version.minor == '4'
        || version.minor == '3' && version.patch == '1')))) {
    throw new Error('Version of @angular/compiler-cli needs to be 2.3.1 or greater. '
      + `Current version is "${version.full}".`);
  }
}

// These imports do not exist on a global install for Angular CLI, so we cannot use a static ES6
// import.
let compilerCli: any = {};
try {
  compilerCli = require('@angular/compiler-cli');
} catch (e) {
  // Don't throw an error if the private API does not exist.
  // Instead, the `CompilerCliIsSupported` method should return throw and indicate the
  // plugin cannot be used.
}

export const VERSION = compilerCli.VERSION;
export const __NGTOOLS_PRIVATE_API_2 = compilerCli.__NGTOOLS_PRIVATE_API_2;

// These imports do not exist on Angular versions lower than 5, so we cannot use a static ES6
// import.
let ngtools2: any = {};
try {
  ngtools2 = require('@angular/compiler-cli/ngtools2');
} catch (e) {
  // Don't throw an error if the private API does not exist.
  // Instead, the `AngularCompilerPlugin.isSupported` method should return false and indicate the
  // plugin cannot be used.
}

export const createProgram: CreateProgramInterface = ngtools2.createProgram;
export const createCompilerHost: CreateCompilerHostInterface = ngtools2.createCompilerHost;
export const formatDiagnostics: FormatDiagnosticsInterface = ngtools2.formatDiagnostics;
export const readConfiguration: ReadConfigurationInterface = compilerCli.readConfiguration;
export const EmitFlags = ngtools2.EmitFlags;

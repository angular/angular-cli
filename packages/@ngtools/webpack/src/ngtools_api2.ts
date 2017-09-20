/**
 * This is a copy of types in @compiler-cli/src/ngtools_api.d.ts file,
 * together with a safe import to support cases where Angular versions is below 5.
 */
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
  emit({ emitFlags, cancellationToken, customTransformers, emitCallback }: {
    emitFlags?: any;
    cancellationToken?: ts.CancellationToken;
    customTransformers?: CustomTransformers;
    emitCallback?: TsEmitCallback;
  }): ts.EmitResult;
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
  (options: CompilerOptions, diags: Diagnostics): string;
}

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
export const EmitFlags = ngtools2.EmitFlags;

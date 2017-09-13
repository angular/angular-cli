/**
 * This is a copy of @compiler-cli/src/ngtools_api.d.ts file.
 */
import { ParseSourceSpan } from '@angular/compiler';
import * as ts from 'typescript';

export const DEFAULT_ERROR_CODE = 100;
export const UNKNOWN_ERROR_CODE = 500;
export const SOURCE = 'angular' as 'angular';
export interface Diagnostic {
  messageText: string;
  span?: ParseSourceSpan;
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
export declare enum EmitFlags {
  DTS = 1,
  JS = 2,
  Default = 3,
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
    emitFlags?: EmitFlags;
    cancellationToken?: ts.CancellationToken;
    customTransformers?: CustomTransformers;
    emitCallback?: TsEmitCallback;
  }): ts.EmitResult;
}
export declare function createProgram({ rootNames, options, host, oldProgram }: {
  rootNames: string[];
  options: CompilerOptions;
  host: CompilerHost;
  oldProgram?: Program;
}): Program;
export declare function createCompilerHost({ options, tsHost }: {
  options: CompilerOptions;
  tsHost?: ts.CompilerHost;
}): CompilerHost;
export declare type Diagnostics = Array<ts.Diagnostic | Diagnostic>;
export declare function formatDiagnostics(options: CompilerOptions, diags: Diagnostics): string;

// Interfaces for the function declarations.
export interface createProgram {
  ({ rootNames, options, host, oldProgram }: {
    rootNames: string[];
    options: CompilerOptions;
    host: CompilerHost;
    oldProgram?: Program;
  }): Program;
}
export interface createCompilerHost {
  ({ options, tsHost }: {
    options: CompilerOptions;
    tsHost?: ts.CompilerHost;
  }): CompilerHost;
}
export interface formatDiagnostics {
  (options: CompilerOptions, diags: Diagnostics): string;
}

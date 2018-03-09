// @ignoreDep @angular/compiler-cli
// @ignoreDep typescript
/**
 * This is a copy of types in @compiler-cli/src/ngtools_api.d.ts file,
 * together with safe imports for private apis for cases where @angular/compiler-cli isn't
 * available or is below version 5.
 */
import * as path from 'path';
import * as ts from 'typescript';
import * as ngc from '@angular/compiler-cli';
import * as ngtools from '@angular/compiler-cli/ngtools2';

export const DEFAULT_ERROR_CODE = 100;
export const UNKNOWN_ERROR_CODE = 500;
export const SOURCE = 'angular' as 'angular';

export type CompilerOptions = ngc.CompilerOptions;
export type CompilerHost = ngtools.CompilerHost;
export type Program = ngtools.Program;
export type Diagnostic = ngtools.Diagnostic;
export type Diagnostics = ReadonlyArray<ts.Diagnostic | Diagnostic>;

// Manually check for Compiler CLI availability and supported version.
// This is needed because @ngtools/webpack does not depend directly on @angular/compiler-cli, since
// it is installed as part of global Angular CLI installs and compiler-cli is not of its
// dependencies.
export function CompilerCliIsSupported() {
  let version;

  // Check that Angular is available.
  try {
    version = (require('@angular/compiler-cli') as typeof ngc).VERSION;
  } catch (e) {
    throw new Error('The "@angular/compiler-cli" package was not properly installed. Error: ' + e);
  }

  // Check that Angular is also not part of this module's node_modules (it should be the project's).
  const compilerCliPath = require.resolve('@angular/compiler-cli');
  if (compilerCliPath.startsWith(path.dirname(__dirname))) {
    throw new Error('The @ngtools/webpack plugin now relies on the project @angular/compiler-cli. '
      + 'Please clean your node_modules and reinstall.');
  }

  // Throw if we're less than 5.x
  if (Number(version.major) < 5) {
    throw new Error('Version of @angular/compiler-cli needs to be 5.0.0 or greater. '
      + `Current version is "${version.full}".`);
  }
}

// These imports do not exist on a global install for Angular CLI, so we cannot use a static ES6
// import.
let compilerCli: typeof ngc;
try {
  compilerCli = require('@angular/compiler-cli');
} catch {
  // Don't throw an error if the private API does not exist.
  // Instead, the `CompilerCliIsSupported` method should return throw and indicate the
  // plugin cannot be used.
}

export const VERSION: typeof ngc.VERSION = compilerCli && compilerCli.VERSION;
export const __NGTOOLS_PRIVATE_API_2: typeof ngc.__NGTOOLS_PRIVATE_API_2 =
  compilerCli && compilerCli.__NGTOOLS_PRIVATE_API_2;
export const readConfiguration: typeof ngc.readConfiguration =
  compilerCli && compilerCli.readConfiguration;

// These imports do not exist on Angular versions lower than 5, so we cannot use a static ES6
// import.
let ngtools2: typeof ngtools;
try {
  ngtools2 = require('@angular/compiler-cli/ngtools2');
} catch {
  // Don't throw an error if the private API does not exist.
  // Instead, the `AngularCompilerPlugin.isSupported` method should return false and indicate the
  // plugin cannot be used.
}

export const createProgram: typeof ngtools.createProgram = ngtools2 && ngtools2.createProgram;
export const createCompilerHost: typeof ngtools.createCompilerHost =
  ngtools2 && ngtools2.createCompilerHost;
export const formatDiagnostics: typeof ngtools.formatDiagnostics =
  ngtools2 && ngtools2.formatDiagnostics;
export const EmitFlags: typeof ngtools.EmitFlags = ngtools2 && ngtools2.EmitFlags;

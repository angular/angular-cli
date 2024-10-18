/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

export enum ProjectType {
  Application = 'application',
  Library = 'library',
}

/**
 * An enum of the official Angular builders.
 * Each enum value provides the fully qualified name of the associated builder.
 * This enum can be used when analyzing the `builder` fields of project configurations from the
 * `angular.json` workspace file.
 */
export enum Builders {
  Application = '@angular-devkit/build-angular:application',
  AppShell = '@angular-devkit/build-angular:app-shell',
  Server = '@angular-devkit/build-angular:server',
  Browser = '@angular-devkit/build-angular:browser',
  SsrDevServer = '@angular-devkit/build-angular:ssr-dev-server',
  Prerender = '@angular-devkit/build-angular:prerender',
  BrowserEsbuild = '@angular-devkit/build-angular:browser-esbuild',
  Karma = '@angular-devkit/build-angular:karma',
  TsLint = '@angular-devkit/build-angular:tslint',
  NgPackagr = '@angular-devkit/build-angular:ng-packagr',
  DevServer = '@angular-devkit/build-angular:dev-server',
  ExtractI18n = '@angular-devkit/build-angular:extract-i18n',
  Protractor = '@angular-devkit/build-angular:private-protractor',
  BuildApplication = '@angular/build:application',
}

export interface FileReplacements {
  replace: string;
  with: string;
}

export interface BrowserBuilderBaseOptions {
  main: string;
  tsConfig: string;
  fileReplacements?: FileReplacements[];
  outputPath?: string;
  index?: string;
  polyfills: string;
  assets?: (object | string)[];
  styles?: (object | string)[];
  scripts?: (object | string)[];
  sourceMap?: boolean;
}

export type OutputHashing = 'all' | 'media' | 'none' | 'bundles';

export interface BrowserBuilderOptions extends BrowserBuilderBaseOptions {
  serviceWorker?: boolean;
  optimization?: boolean;
  outputHashing?: OutputHashing;
  resourcesOutputPath?: string;
  namedChunks?: boolean;
  aot?: boolean;
  extractLicenses?: boolean;
  vendorChunk?: boolean;
  buildOptimizer?: boolean;
  ngswConfigPath?: string;
  budgets?: {
    type: string;
    maximumWarning?: string;
    maximumError?: string;
  }[];
  webWorkerTsConfig?: string;
}

export interface ServeBuilderOptions {
  buildTarget: string;
}

export interface LibraryBuilderOptions {
  tsConfig: string;
  project: string;
}

export interface ServerBuilderOptions {
  outputPath: string;
  tsConfig: string;
  main: string;
  fileReplacements?: FileReplacements[];
  optimization?:
    | boolean
    | {
        scripts?: boolean;
        styles?: boolean;
      };
  sourceMap?:
    | boolean
    | {
        scripts?: boolean;
        styles?: boolean;
        hidden?: boolean;
        vendor?: boolean;
      };
}

export interface AppShellBuilderOptions {
  browserTarget: string;
  serverTarget: string;
  route: string;
}

export interface TestBuilderOptions extends Partial<BrowserBuilderBaseOptions> {
  karmaConfig: string;
}

export interface ExtractI18nOptions {
  browserTarget: string;
}

export interface E2EOptions {
  protractorConfig: string;
  devServerTarget: string;
}

export interface BuilderTarget<TBuilder extends Builders, TOptions> {
  builder: TBuilder;
  options: TOptions;
  configurations?: {
    production: Partial<TOptions>;
    [key: string]: Partial<TOptions>;
  };
}

export type LibraryBuilderTarget = BuilderTarget<Builders.NgPackagr, LibraryBuilderOptions>;
export type BrowserBuilderTarget = BuilderTarget<Builders.Browser, BrowserBuilderOptions>;
export type ServerBuilderTarget = BuilderTarget<Builders.Server, ServerBuilderOptions>;
export type AppShellBuilderTarget = BuilderTarget<Builders.AppShell, AppShellBuilderOptions>;
export type TestBuilderTarget = BuilderTarget<Builders.Karma, TestBuilderOptions>;
export type ServeBuilderTarget = BuilderTarget<Builders.DevServer, ServeBuilderOptions>;
export type ExtractI18nBuilderTarget = BuilderTarget<Builders.ExtractI18n, ExtractI18nOptions>;
export type E2EBuilderTarget = BuilderTarget<Builders.Protractor, E2EOptions>;

interface WorkspaceCLISchema {
  warnings?: Record<string, boolean>;
  schematicCollections?: string[];
}
export interface WorkspaceSchema {
  version: 1;
  cli?: WorkspaceCLISchema;
  projects: {
    [key: string]: WorkspaceProject<ProjectType.Application | ProjectType.Library>;
  };
}

export interface WorkspaceProject<TProjectType extends ProjectType = ProjectType.Application> {
  /**
   * Project type.
   */
  projectType: ProjectType;

  root: string;
  sourceRoot: string;
  prefix: string;

  cli?: WorkspaceCLISchema;

  /**
   * Tool options.
   */
  architect?: WorkspaceTargets<TProjectType>;

  /**
   * Tool options.
   */
  targets?: WorkspaceTargets<TProjectType>;
}

export interface WorkspaceTargets<TProjectType extends ProjectType = ProjectType.Application> {
  build?: TProjectType extends ProjectType.Library ? LibraryBuilderTarget : BrowserBuilderTarget;
  server?: ServerBuilderTarget;
  test?: TestBuilderTarget;
  serve?: ServeBuilderTarget;
  e2e?: E2EBuilderTarget;
  'app-shell'?: AppShellBuilderTarget;
  'extract-i18n'?: ExtractI18nBuilderTarget;
  // TODO(hans): change this any to unknown when google3 supports TypeScript 3.0.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

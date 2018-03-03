// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

export interface BuildOptions {
  optimizationLevel: number;
  environment?: string;
  outputPath: string;
  aot?: boolean;
  sourceMap?: boolean;
  evalSourceMap?: boolean;
  vendorChunk?: boolean;
  commonChunk?: boolean;
  baseHref?: string;
  deployUrl?: string;
  verbose?: boolean;
  progress?: boolean;
  i18nFile?: string;
  i18nFormat?: string;
  i18nOutFile?: string;
  i18nOutFormat?: string;
  i18nLocale?: string;
  i18nMissingTranslation?: string;
  extractCss?: boolean;
  bundleDependencies?: 'none' | 'all';
  watch?: boolean;
  outputHashing?: string;
  poll?: number;
  app?: string;
  deleteOutputPath?: boolean;
  preserveSymlinks?: boolean;
  extractLicenses?: boolean;
  showCircularDependencies?: boolean;
  buildOptimizer?: boolean;
  namedChunks?: boolean;
  subresourceIntegrity?: boolean;
  serviceWorker?: boolean;
  skipAppShell?: boolean;
  statsJson: boolean;
  forkTypeChecker: boolean;
}

export interface WebpackConfigOptions<T extends BuildOptions = BuildOptions> {
  projectRoot: string;
  buildOptions: T;
  appConfig: any;
  tsConfig: any;
  supportES2015: boolean;
}

export interface WebpackTestOptions extends BuildOptions {
  codeCoverage?: boolean;
  codeCoverageExclude: string[];
}

export interface BuildOptions {
  target?: string;
  environment?: string;
  outputPath?: string;
  aot?: boolean;
  sourcemaps?: boolean;
  vendorChunk?: boolean;
  baseHref?: string;
  deployUrl?: string;
  verbose?: boolean;
  progress?: boolean;
  i18nFile?: string;
  i18nFormat?: string;
  locale?: string;
  extractCss?: boolean;
  watch?: boolean;
  outputHashing?: string;
  poll?: number;
  app?: string;
  deleteOutputPath?: boolean;
  preserveSymlinks?: boolean;
  extractLicenses?: boolean;
  showCircularDependencies?: boolean;
}

export interface BuildOptions {
  target?: string;
  environment?: string;
  outputPath?: string;
  aot?: boolean;
  sourcemap?: boolean;
  vendorChunk?: boolean;
  baseHref?: string;
  deployUrl?: string;
  verbose?: boolean;
  progress?: boolean;
  i18nFile?: string;
  i18nFormat?: string;
  locale?: string;
  extractCss?: boolean;
  outputHashing?: string;
}

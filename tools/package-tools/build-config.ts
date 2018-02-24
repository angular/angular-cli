export interface BuildConfig {
  /** Current version of the project. */
  projectVersion: string;
  /** Required Angular version for the project. */
  angularVersion: string;
  /** Path to the root of the project. */
  projectDir: string;
  /** Path to the directory where all packages are living. */
  packagesDir: string;
  /** Path to the directory where the output will be stored. */
  outputDir: string;
  /** License banner that will be placed inside of every bundle. */
  licenseBanner: string;
  /** The namespace for the packages, e.g. @nguniversal for @nguniversal/common */
  namespace: string;
  /** The library entrypoints that are built under the namespace */
  libNames: string[];
}

// Load the config file using a basic CommonJS import.
export const buildConfig = require('../../build-config') as BuildConfig;

if (!buildConfig) {
  throw 'Universal Build tools were not able to find a build config. ' +
  'Please create a "build-config.js" file in your project.';
}

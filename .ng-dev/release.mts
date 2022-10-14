import { ReleaseConfig } from '@angular/ng-dev';
import { join } from 'path';

/** Configuration for the `ng-dev release` command. */
export const release: ReleaseConfig = {
  representativeNpmPackage: '@nguniversal/common',
  npmPackages: [
    { name: '@nguniversal/builders' },
    { name: '@nguniversal/common' },
    { name: '@nguniversal/express-engine' },
  ],
  releaseNotes: {
    groupOrder: ['@nguniversal/common', '@nguniversal/builders', '@nguniversal/express-engine'],
  },
  publishRegistry: 'https://wombat-dressing-room.appspot.com',
  releasePrLabels: ['action: merge'],
  buildPackages: async () => {
    // The buildTargetPackages function is loaded at runtime as the loading the
    // script causes an invocation of bazel.
    // TODO: Consider converting the package builder to TypeScript.
    const packageBuilder = await import('../scripts/package-builder.js');

    return packageBuilder.default.buildTargetPackages(
      'dist/release-output',
      'Release',
      /* isRelease */ true,
    );
  },
};

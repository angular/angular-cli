import { ReleaseConfig } from '@angular/ng-dev';
import packages from '../lib/packages.js';

const npmPackages = Object.entries(packages.releasePackages).map(([name, { experimental }]) => ({
  name,
  experimental,
}));

/** Configuration for the `ng-dev release` command. */
export const release: ReleaseConfig = {
  representativeNpmPackage: '@angular/cli',
  npmPackages,
  buildPackages: async () => {
    // The `performNpmReleaseBuild` function is loaded at runtime to avoid loading additional
    // files and dependencies unless a build is required.
    const { performNpmReleaseBuild } = await import('../scripts/build-packages-dist.mjs');
    return performNpmReleaseBuild();
  },
  releaseNotes: {
    groupOrder: [
      '@angular/cli',
      '@schematics/angular',
      '@angular-devkit/architect-cli',
      '@angular-devkit/schematics-cli',
    ],
  },
  publishRegistry: 'https://wombat-dressing-room.appspot.com',
  releasePrLabels: ['action: merge'],
};

import semver from 'semver';
import { releasePackages } from '../scripts/packages.mts';

/**
 * Configuration for the `ng-dev release` command.
 *
 * @type { import("@angular/ng-dev").ReleaseConfig }
 */
export const release = {
  representativeNpmPackage: '@angular/cli',
  npmPackages: releasePackages.map(({ name, experimental }) => {
    if (
      name === '@angular-devkit/build-angular' ||
      name === '@angular-devkit/build-webpack' ||
      name === '@ngtools/webpack'
    ) {
      return {
        name,
        experimental,
        deprecated: {
          version: '>=22.0.0-rc.0',
          message:
            'Angular\'s Webpack support is deprecated. Use the esbuild and Vite-based "@angular/build" package instead.',
        },
      };
    }

    return { name, experimental };
  }),
  buildPackages: async () => {
    // The `performNpmReleaseBuild` function is loaded at runtime to avoid loading additional
    // files and dependencies unless a build is required.
    const { performNpmReleaseBuild } = await import('../scripts/build-packages-dist.mts');
    return performNpmReleaseBuild();
  },
  prereleaseCheck: async (newVersionStr) => {
    const newVersion = new semver.SemVer(newVersionStr);
    const { assertValidDependencyRanges } =
      await import('../scripts/release-checks/dependency-ranges/index.mts');

    await assertValidDependencyRanges(newVersion, releasePackages);
  },
  releaseNotes: {
    groupOrder: ['@angular/cli', '@schematics/angular', '@angular-devkit/schematics-cli'],
  },
  publishRegistry: 'https://wombat-dressing-room.appspot.com',
  releasePrLabels: ['action: merge'],
};

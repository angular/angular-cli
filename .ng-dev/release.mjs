import semver from 'semver';
import { releasePackages } from '../scripts/packages.mjs';

/**
 * Configuration for the `ng-dev release` command.
 *
 * @type { import("@angular/ng-dev").ReleaseConfig }
 */
export const release = {
  representativeNpmPackage: '@angular/cli',
  npmPackages: releasePackages.map(({ name, experimental }) => ({ name, experimental })),
  buildPackages: async () => {
    // The `performNpmReleaseBuild` function is loaded at runtime to avoid loading additional
    // files and dependencies unless a build is required.
    const { performNpmReleaseBuild } = await import('../scripts/build-packages-dist.mjs');
    return performNpmReleaseBuild();
  },
  prereleaseCheck: async (newVersionStr) => {
    const newVersion = new semver.SemVer(newVersionStr);
    const { assertValidDependencyRanges } = await import(
      '../scripts/release-checks/dependency-ranges/index.mjs'
    );

    await assertValidDependencyRanges(newVersion, releasePackages);
  },
  releaseNotes: {
    groupOrder: [
      '@angular/cli',
      '@schematics/angular',
      '@angular-devkit/architect-cli',
      '@angular-devkit/schematics-cli',
    ],
  },
  // TODO: Remove after `rules_js` migration.
  rulesJsInteropMode: true,
  publishRegistry: 'https://wombat-dressing-room.appspot.com',
  releasePrLabels: ['action: merge'],
};

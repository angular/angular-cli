import '../lib/bootstrap-local.js';

import { ReleaseConfig } from '@angular/ng-dev';
import packages from '../lib/packages.js';
import buildPackages from '../scripts/build.js';

const npmPackages = Object.entries(packages.releasePackages).map(([name, { experimental }]) => ({
  name,
  experimental,
}));

/** Configuration for the `ng-dev release` command. */
export const release: ReleaseConfig = {
  representativeNpmPackage: '@angular/cli',
  npmPackages,
  buildPackages: () => buildPackages.default(),
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

import '../lib/bootstrap-local';

import { ReleaseConfig } from '@angular/dev-infra-private/ng-dev/release/config';
import { releasePackages } from '../lib/packages';
import buildPackages from '../scripts/build';

const npmPackages = Object.entries(releasePackages).map(([name, { experimental }]) => ({
  name,
  experimental,
}));

/** Configuration for the `ng-dev release` command. */
export const release: ReleaseConfig = {
  representativeNpmPackage: '@angular/cli',
  npmPackages,
  buildPackages: () => buildPackages(),
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

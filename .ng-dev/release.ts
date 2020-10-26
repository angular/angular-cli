import { ReleaseConfig } from '@angular/dev-infra-private/release/config';
import { packages } from '../lib/packages';

/** Configuration for the `ng-dev release` command. */
export const release: ReleaseConfig = {
  npmPackages: Object.keys(packages),
  // TODO: Set up package building.
  buildPackages: async () => [],
  // TODO: Set up generating changelogs
  generateReleaseNotesForHead: async () => {},
};

import { ReleaseConfig } from '@angular/dev-infra-private/release/config';

/** Configuration for the `ng-dev release` command. */
export const release: ReleaseConfig = {
  npmPackages: [
    '@nguniversal/aspnetcore-engine',
    '@nguniversal/builders',
    '@nguniversal/common',
    '@nguniversal/express-engine',
    '@nguniversal/hapi-engine',
    '@nguniversal/socket-engine',
    '@nguniversal/module-map-ngfactory-loader',
  ],
  // TODO: Set up package building.
  buildPackages: async () => [],
  // TODO: Set up generating changelogs
  generateReleaseNotesForHead: async () => {},
};

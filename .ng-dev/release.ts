import { ReleaseConfig } from '@angular/dev-infra-private/ng-dev/release/config';

/** Configuration for the `ng-dev release` command. */
export const release: ReleaseConfig = {
  npmPackages: [
    '@nguniversal/aspnetcore-engine',
    '@nguniversal/builders',
    '@nguniversal/common',
    '@nguniversal/express-engine',
    '@nguniversal/hapi-engine',
    '@nguniversal/socket-engine',
  ],
  releaseNotes: {
    groupOrder: ['@nguniversal/common', '@nguniversal/builders', '@nguniversal/express-engine'],
  },
  publishRegistry: 'https://wombat-dressing-room.appspot.com',
  releasePrLabels: ['action: merge'],
  // TODO: Set up package building.
  buildPackages: async () => [],
};

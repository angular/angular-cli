import { FormatConfig } from '@angular/dev-infra-private/ng-dev';

/**
 * Configuration for the `ng-dev format` command.
 */
export const format: FormatConfig = {
  'prettier': {
    matchers: ['**/*.{ts,js,json,yml,yaml,md}'],
  },
  'buildifier': true,
};

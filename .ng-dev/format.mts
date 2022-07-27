import { FormatConfig } from '@angular/ng-dev';

/**
 * Configuration for the `ng-dev format` command.
 */
export const format: FormatConfig = {
  'prettier': {
    matchers: ['**/*.{ts,js,json,yml,yaml,md}'],
  },
  'buildifier': true,
};

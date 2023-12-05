/**
 * Configuration for the `ng-dev format` command.
 * 
 * @type { import("@angular/ng-dev").FormatConfig }
 */
export const format = {
  'prettier': {
    matchers: ['**/*.{ts,js,json,yml,yaml,md}'],
  },
  'buildifier': true,
};

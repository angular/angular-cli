/**
 * Configuration for the `ng-dev format` command.
 *
 * @type { import("@angular/ng-dev").FormatConfig }
 */
export const format = {
  'prettier': {
    matchers: ['**/*.{mts,cts,ts,mjs,cjs,js,json,yml,yaml,md}'],
  },
  'buildifier': true,
};

import { packages } from '../scripts/packages.mts';

/**
 * The configuration for `ng-dev commit-message` commands.
 *
 * @type { import("@angular/ng-dev").CommitMessageConfig }
 */
export const commitMessage = {
  maxLineLength: Infinity,
  minBodyLength: 0,
  minBodyLengthTypeExcludes: ['docs'],
  // Note: When changing this logic, also change the `contributing.ejs` file.
  scopes: packages.map(({ name }) => name),
};

import packages from '../lib/packages.js';

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
  scopes: [...Object.keys(packages.packages)],
};

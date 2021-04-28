// tslint:disable-next-line: no-implicit-dependencies
import {
  COMMIT_TYPES,
  CommitMessageConfig,
  ScopeRequirement,
} from '@angular/dev-infra-private/commit-message/config';
import { packages } from '../lib/packages';

/**
 * The details for valid commit types.
 * This is exported so that other tooling can access both the types and scopes from one location.
 * Currently used in the contributing documentation template (scripts/templates/contributing.ejs)
 */
export { COMMIT_TYPES, ScopeRequirement };

/**
 * The configuration for `ng-dev commit-message` commands.
 */
export const commitMessage: CommitMessageConfig = {
  maxLineLength: Infinity,
  minBodyLength: 0,
  minBodyLengthTypeExcludes: ['docs'],
  scopes: [...Object.keys(packages)],
};

import { CommitMessageConfig } from '@angular/dev-infra-private/ng-dev/commit-message/config';
import { release } from './release';

/**
 * The configuration for `ng-dev commit-message` commands.
 */
export const commitMessage: CommitMessageConfig = {
  maxLineLength: Infinity,
  minBodyLength: 0,
  minBodyLengthTypeExcludes: ['docs'],
  scopes: release.npmPackages.map(({ name }) => name),
};

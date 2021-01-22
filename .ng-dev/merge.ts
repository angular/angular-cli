import { DevInfraMergeConfig } from '@angular/dev-infra-private/pr/merge/config';
import { getDefaultTargetLabelConfiguration } from '@angular/dev-infra-private/pr/merge/defaults';
import { github } from './github';
import { release } from './release';

/**
 * Configuration for the merge tool in `ng-dev`. This sets up the labels which
 * are respected by the merge script (e.g. the target labels).
 */
export const merge: DevInfraMergeConfig['merge'] = async api => {
  return {
    githubApiMerge: {
      default: 'rebase',
      labels: [
        {pattern: 'squash commits', method: 'squash'},
      ],
    },
    claSignedLabel: 'cla: yes',
    mergeReadyLabel: /^action: merge(-assistance)?/,
    caretakerNoteLabel: /(action: merge-assistance)/,
    commitMessageFixupLabel: 'commit message fixup',
    // We can pick any of the NPM packages as we are in a monorepo where all packages are
    // published together with the same version and branching.
    labels: await getDefaultTargetLabelConfiguration(api, github, release),
  };
};

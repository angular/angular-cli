import { PullRequestConfig } from '@angular/ng-dev';

/**
 * Configuration for the merge tool in `ng-dev`. This sets up the labels which
 * are respected by the merge script (e.g. the target labels).
 */
export const pullRequest: PullRequestConfig = {
  githubApiMerge: {
    default: 'rebase',
    labels: [{ pattern: 'merge: squash commits', method: 'squash' }],
  },
  mergeReadyLabel: 'action: merge',
  caretakerNoteLabel: 'action: caretaker note',
  commitMessageFixupLabel: 'merge: fix commit message',
};

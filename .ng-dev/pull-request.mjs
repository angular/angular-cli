/**
 * Configuration for the merge tool in `ng-dev`. This sets up the labels which
 * are respected by the merge script (e.g. the target labels).
 * 
 * @type { import("@angular/ng-dev").PullRequestConfig }
 */
export const pullRequest = {
  githubApiMerge: {
    default: 'rebase',
    labels: [{ pattern: 'merge: squash commits', method: 'squash' }],
  },
};

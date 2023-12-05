/**
 * Github configuration for the ng-dev command. This repository is
 * used as remote for the merge script.
 * 
 * @type { import("@angular/ng-dev").GithubConfig }
 */
export const github = {
  owner: 'angular',
  name: 'angular-cli',
  mainBranchName: 'main',
  useNgDevAuthService: true,
};

# Setting Up Local Repository

1. Clone the Angular-CLI repo. A local copy works just fine.
1. Create an upstream remote:
  ```bash
  $ git remote add upstream https://github.com/angular/angular-cli.git
  ```

# Caretaker

The caretaker should triage issues, merge PR, and sheppard the release.

Caretaker calendar can be found [here](https://calendar.google.com/calendar?cid=Z29vZ2xlLmNvbV9zZjlvODF0NGE4NzE5ZmtiMnBoZnA4MGk2Z0Bncm91cC5jYWxlbmRhci5nb29nbGUuY29t).

## Triaging Issues
TBD

## Merging PRs

The list of PRs which are currently ready to merge (approved with passing status checks) can
be found with [this search](https://github.com/angular/angular-cli/pulls?q=is%3Apr+is%3Aopen+label%3A%22PR+action%3A+merge%22+-is%3Adraft).
This list should be checked daily and any ready PRs should be merged. For each
PR, check the `PR target` label to understand where it should be merged to. If
`master` is targetted, then click "Rebase and Merge". If the PR also targets a
patch branch, see [Maintaining Patch Branches](#maintaining-patch-branches).
Whatever the target, rebasing should be used over merging to avoid cluttering
the Git history with merge commits.

### Maintaining Patch Branches

When a PR is merged, if the `PR target` label includes a branch other than
`master`, commits will need to be cherry-picked to an associated branch. In
particular, the `patch` target simply refers to the latest patch branch (eg.
`1.2.x` or `1.3.x-rc.0`). This branch should be updated by cherry-picking all
_applicable_ commits to it, such as those with messages beginning with `fix()`,
`docs()`, or `refactor()`.

Say the following PR is merged;

```text
* fix(@angular/cli): fix path when doing stuff
* refactor(@angular-devkit/core): replace Fizz with Buzz
* feat(@angular-devkit/core): add new feature
* fix(@angular-devkit/core): fix something related to new feature
* refactor(@angular-devkit/core): move stuff to new feature
```

Only the first 2 commits should be cherry picked to the patch branch, as the last 3 are related to a new feature.

Cherry picking is done by checking out the patch branch and cherry picking the new commit onto it.
The patch branch is simply named as a version number, with a X in the relevant spot, such as `9.0.x`.
This should be done after merging to master.

```shell
# Make sure commit to upstream/master is present in local repo.
git fetch upstream master

# Check out patch branch from upstream.
git fetch upstream <patch branch>
git checkout <patch branch>

# Cherry pick the commit. Use the hash from the commit which was merged
# into upstream/master, which should be known to your local repo.
git cherry-pick -x <commit hash from master>
# If you have multiple cherry picks, you can do them all here.

# Resolve merge conflicts if necessary...
# Or abort and ask author to submit a separate commit targeting patch-only.

# Push changes.
git push upstream <patch branch>
```

If you get a `bad revision` error when cherry picking, make sure you are using
the commit hash used when merged into `master`, _not_ the hash listed in the PR.
Also verify that you have fetched `master` from `upstream` since that commit was
merged.

If the commit is not merged to `master` (because it targets `patch only` for
instance), then you will need to fetch the contributor's branch for your local
Git instance to have knowledge of the commit being cherry picked onto the patch
branch.

### Maintaining LTS branches

Releases that are under Long Term Support (LTS) are listed on [angular.io](https://angular.io/guide/releases#support-policy-and-schedule).

Since there could be more than one LTS branch at any one time, PR authors who want to
merge commits into LTS branches must open a pull request against the specific base branch they'd like to target.

In general, cherry picks for LTS should only be done if it meets one of the criteria below:

1. It addresses a critical security vulnerability.
2. It fixes a breaking change in the external environment.  
   For example, this could happen if one of the dependencies is deleted from NPM.
3. It fixes a legitimate failure on CI for a particular LTS branch.

# Release

## Before releasing

Make sure the CI is green.

Consider if you need to update [`packages/schematics/angular/utility/latest-versions.ts`](https://github.com/angular/angular-cli/blob/master/packages/schematics/angular/utility/latest-versions.ts) to reflect changes in dependent versions.

## Shepparding

As commits are cherry-picked when PRs are merged, creating the release should be a matter of creating a tag.

**Make sure you update the package versions in `packages/schematics/angular/utility/latest-versions.ts`.**

```bash
git commit -a -m 'release: vXX'
git tag 'vXX'
git push upstream && git push upstream --tags
```

### Authenticating

**This can ONLY be done by a Google employee.**

Log in to [NPM](https://npmjs.com/) to the `angular` account in order to
publish. This account is protected by two factor authentication (2FA).

Run `npm login`:

1. For username, use `angular`.
1. For password, use the value stored [here](http://go/ng-npm-pass).
1. For email, use `devops+npm@angular.io`.
1. For two-factor code, you'll need to set up the account.
    * Use an authenticator app such as [Google Authenticator](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2).
    * Add a new account and enter the text key from [here](http://go/ng-npm-2fa).
    * The app will start showing two-factor codes, enter one into the
        `npm login` prompt.

Once successfully logged in, it is time to publish.

### Publishing

**This can ONLY be done by a Google employee.**

**It is a good idea to wait for CI to be green on the patch branch and tag before doing the release.**

Check out the patch tag (e.g. `v6.7.8`), then run:
```sh
devkit-admin publish
```

Check out the minor tag (e.g. `v6.8.0-beta.0`), then run:
```bash
devkit-admin publish --tag next
```

### Release Notes

`devkit-admin changelog` takes `from` and `to` arguments which are any valid git
ref.

For example, running the following command will output the release notes on
stdout between v1.2.3 and 1.2.4:

```bash
devkit-admin changelog --from=v1.2.3 --to=v1.2.4
```

Copy the output (you can use `| pbcopy` on MacOS or `|xclip` on Linux) and
paste the release notes on [GitHub](https://github.com/angular/angular-cli/releases)
for the tag just released.

If you have an API token for GitHub you can create a draft automatically by
using the `--githubToken` flag. You just then have to confirm the draft.

> **Tags containing `beta` or `rc` should be marked as pre-release.**

### Microsite Publishing

The [microsite](https://cli.angular.io/) is the landing page for Angular CLI and
is a one-page static page.

> **This can ONLY be done by a Google employee.**
>
> **You will need firebase access to our cli-angular-io firebase site. If you don't have it, escalate.**

Check out if changes were made to the microsite:

```sh
git log v8.0.0-beta.0..HEAD --oneline etc/cli.angular.io | wc -l
```

If the number is 0 you can ignore the rest of this section.

To publish, go to the
[`angular-cli/etc/cli.angular.io`](https://github.com/angular/angular-cli/tree/master/etc/cli.angular.io)
directory and run `firebase deploy`. You might have to `firebase login` first.
If you don't have the firebase CLI installed, you can install it using
`npm install --global firebase-tools` (or use your package manager of choice).

This is detailed in [`etc/cli.angular.io/README.md`](https://github.com/angular/angular-cli/blob/master/etc/cli.angular.io/README.md).

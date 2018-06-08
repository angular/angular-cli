> Hans Larsen (hansl@google.com)  
> June 8th, 2018  


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
TBD

### Maintaining Patch Branches
Everytime a PR is merged, commits need to be cherry-picked to an associated branch;
* the latest patch branch (e.g. `1.2.x` or `1.3.x-rc.0`) should also be updated by cherry-picking all _applicable_
  commits to it. `fix()`, `docs()`, `refactor()` and 

Say the following PR is merged;

```text
* fix(@angular/cli): fix path when doing stuff
* refactor(@angular-devkit/core): replace Fizz with Buzz
* feat(@angular-devkit/core): add new feature
* fix(@angular-devkit/core): fix something related to new feature
* refactor(@angular-devkit/core): move stuff to new feature
```

Only the first 2 commits should be cherry picked to the patch branch, as the last 3 are related to a new feature.

# Release

## Shepparding

As commits are cherry-picked when PRs are merged, creating the release should be a matter of updating the version
numbers. This can be done with the following command (for patch):

```bash
devkit-admin release patch --force
```

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

Running the following command will output the release notes on stdout between v1.2.3 and 1.2.4:

```bash
devkit-admin changelog --from=v1.2.3 --to=v1.2.4
``` 

Copy paste the output (you can use `| pbcopy` on MacOS) and create the release notes on github for the tag just
released. If you have an API token for GitHub you can create a draft automatically by using the `--githubToken` flag.
You just have then to confirm the draft.

**Tags containing `beta` or `rc` should be marked as pre-release.**


# Setting Up Local Repository

1. Clone the Angular-CLI repo. A local copy works just fine.
1. Create an upstream remote:

```bash
$ git remote add upstream https://github.com/angular/angular-cli.git
```

# Caretaker

The caretaker should triage issues, merge PR, and sheppard the release.

Caretaker rotation can be found
[here](https://rotations.corp.google.com/rotation/5117919353110528) and individual shifts can
be modified as necessary to accomodate caretaker's schedules. This automatically syncs to a
Google Calendar
[here](https://calendar.google.com/calendar/u/0/embed?src=c_6s96kkvd7nhink3e2gnkvfrt1g@group.calendar.google.com).
Click the "+" button in the bottom right to add it to your calendar to see shifts alongside the
rest of your schedule.

The primary caretaker is responsible for both merging PRs and performing the weekly release.
The secondary caretaker does not have any _direct_ responsibilities, but they may need to take
over the primary's responsibilities if the primary is unavailable for an extended time (a day
or more) or in the event of an emergency.

The primary is also responsible for releasing
[Angular Universal](https://github.com/angular/universal/), but _not_ responsible for merging
PRs.

At the end of each caretaker's rotation, the primary should peform a handoff in which they
provide information to the next caretaker about the current state of the repository and update
the access group to now include the next caretakers. To perform this update to the access group,
the caretaker can run:

```bash
$ yarn ng-dev caretaker handoff
```

## Merging PRs

The list of PRs which are currently ready to merge (approved with passing status checks) can
be found with [this search](https://github.com/angular/angular-cli/pulls?q=is%3Apr+is%3Aopen+label%3A%22action%3A+merge%22+-is%3Adraft).
This list should be checked daily and any ready PRs should be merged. For each PR, check the
`target` label to understand where it should be merged to. You can find which branches a specific
PR will be merged into with the `yarn ng-dev pr check-target-branches <pr>` command.

When ready to merge a PR, run the following command:

```
yarn ng-dev pr merge <pr>
```

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

Releasing is performed using Angular's unified release tooling. Each week, two releases are expected, `latest` and `next` on npm.

**For a minor OR major release:**

After FW releases `-rc.0` for an upcoming minor/major version, update the corresponding version in:

- [`latest-versions.ts`](/packages/schematics/angular/utility/latest-versions.ts#L=18)
- [`@angular-devkit/build-angular`](/packages/angular_devkit/build_angular/package.json)
- [`@ngtools/webpack`](/packages/ngtools/webpack/package.json)

The same needs to be done for a `-next.0` release, and needs to be done for both minor _and_ major
releases.

Once FW releases the actual minor/major release (for example: `13.0.0` or `13.1.0`), these versions
should be updated to match (remove `-rc.0` and `-next.0`). This **must** be done as a separate PR
which lands after FW releases (or else CI will fail) but _before_ the CLI release PR. Releases are
built before the PR is sent for review, so any changes after that point won't be included in the
release.

**For a major release:**

**As part of the release PR**, make sure to:

- modify
  [`latest-versions.ts`](https://github.com/angular/angular-cli/blob/main/packages/schematics/angular/utility/latest-versions.ts#L18)
  so the Angular semver is updated from `~13.0.0-rc` to just `~13.0.0`.
  - This is the version generated in `ng new` schematics and needs to be updated to avoid having
    users generate projects with `-rc` in the dependencies.
- update the
  [`ng-packagr`](https://github.com/angular/angular-cli/blob/main/packages/schematics/angular/utility/latest-versions/package.json#L15)
  dependency to a stable version (ex. from `^13.0.0-next.0` to `^13.0.0`).

When a release is transitioning from a prerelease to a stable release, the semver ranges for Angular
dependencies within the packages' `package.json` files will need to be updated to remove the
prerelease version segment. For example, `"@angular/compiler-cli": "^13.0.0 || ^13.0.0-next"` in a
prerelease should become `"@angular/compiler-cli": "^13.0.0"` in the stable release. This can happen
as a follow-up item _after_ the release PR and the stable release, actually shipped in the `13.0.1`
release. The current packages that require adjustment are:

- `@angular-devkit/build-angular`: [packages/angular_devkit/build_angular/package.json](/packages/angular_devkit/build_angular/package.json)
- `@ngtools/webpack`: [packages/ngtools/webpack/package.json](/packages/ngtools/webpack/package.json)

## Releasing the CLI

Typical patch and next releases do not require FW to release in advance, as CLI does not pin the FW
dependency.

After confirming that the above steps have been done or are not necessary, run the following and
navigate the prompts:

```sh
yarn ng-dev release publish
```

Releases should be done in "reverse semver order", meaning they should follow:

Oldest LTS -> Newest LTS -> Patch -> RC -> Next

This can skip any versions which don't need releases, so most weeks are just "Patch -> Next".

### Angular Universal

After CLI releases, the primary is also responsible for releasing Angular Universal if necessary.
Follow [the instructions there](https://github.com/angular/universal/blob/main/docs/process/release.md)
for the release process. If there are no changes to Universal, then the release can be skipped.

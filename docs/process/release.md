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
be modified as necessary to accommodate caretaker's schedules. This automatically syncs to a
Google Calendar
[here](https://calendar.google.com/calendar/u/0/embed?src=c_6s96kkvd7nhink3e2gnkvfrt1g@group.calendar.google.com).
Click the "+" button in the bottom right to add it to your calendar to see shifts alongside the
rest of your schedule.

The primary caretaker is responsible for both merging PRs and performing the weekly release.
The secondary caretaker does not have any _direct_ responsibilities, but they may need to take
over the primary's responsibilities if the primary is unavailable for an extended time (a day
or more) or in the event of an emergency.

At the end of each caretaker's rotation, the primary should perform a handoff in which they
provide information to the next caretaker about the current state of the repository and update
the access group to now include the next caretakers. To perform this update to the access group,
the caretaker can run:

```bash
$ pnpm ng-dev caretaker handoff
```

## Merging PRs

The list of PRs which are currently ready to merge (approved with passing status checks) can
be found with [this search](https://github.com/angular/angular-cli/pulls?q=is%3Apr+is%3Aopen+label%3A%22action%3A+merge%22+-is%3Adraft).
This list should be checked daily and any ready PRs should be merged. For each PR, check the
`target` label to understand where it should be merged to. You can find which branches a specific
PR will be merged into with the `pnpm ng-dev pr check-target-branches <pr>` command.

When ready to merge a PR, run the following command:

```bash
pnpm ng-dev pr merge <pr>
```

### Maintaining LTS branches

Releases that are under Long Term Support (LTS) are listed on [angular.dev](https://angular.dev/reference/releases#support-policy-and-schedule).

Since there could be more than one LTS branch at any one time, PR authors who want to
merge commits into LTS branches must open a pull request against the specific base branch they'd like to target.

In general, cherry picks for LTS should only be done if it meets one of the criteria below:

1. It addresses a critical security vulnerability.
2. It fixes a breaking change in the external environment.
   For example, this could happen if one of the dependencies is deleted from NPM.
3. It fixes a legitimate failure on CI for a particular LTS branch.

# Release

Releasing is performed using Angular's unified release tooling. Each week, two releases are expected, `latest` and `next` on npm.

**DURING a minor OR major CLI release:**

Once FW releases the actual minor/major release (for example: `13.0.0` or `13.1.0`), update dependencies with the following:

1.  Update [`constants.bzl`](../../constants.bzl) so `@angular/core` and `ng-packagr` are using the release version (drop `-next.0`).

Merge the above change in a separate PR which lands _after_ FW releases (or else CI will fail) but _before_ the CLI
release PR. Releases are built before the PR is sent for review, so any changes after that point won't be included in the release.

**AFTER a minor OR major CLI release:**

`constants.bzl` also needs to be updated to use `-next.0` after a major or minor release. However this needs to happen _after_ FW
publishes the initial `-next.0` release, which will happen 1 week after the major or minor release.

## Releasing the CLI

Typical patch and next releases do not require FW to release in advance, as CLI does not pin the FW
dependency.

After confirming that the above steps have been done or are not necessary, run the following and
navigate the prompts:

```sh
pnpm ng-dev release publish
```

Releases should be done in "reverse semver order", meaning they should follow:

Oldest LTS -> Newest LTS -> Patch -> RC -> Next

This can skip any versions which don't need releases, so most weeks are just "Patch -> Next".

## Releasing a new package

Wombat has some special access requirements which need to be configured to publish a new NPM package.

See [this Wombat doc](http://g3doc/company/teams/cloud-client-libraries/team/automation/docs/npm-publish-service#existing-package)
and [this postmortem](http://docs/document/d/1emx2mhvF5xMzNUlDrVRYKI_u4iUOnVrg3rV6c5jk2is?resourcekey=0-qpsFbBfwioYT4f6kyUm8ZA&tab=t.0)
for more info.

Angular is _not_ an organization on NPM, therefore each package is published
independently and Wombat access needs to be managed individually. This also means
we can't rely on Wombat already having access to a new package.

In order to configure a brand new NPM package, it first needs to be published
manually so we can add Wombat access to it. Note that this step can and should be
done prior to weekly releases. The sooner this can be done, the less likely it
will block the next weekly release.

1.  Check out the `main` branch, which should always have a `-next` version.
    - This avoids having the initial publish actually be used in production.
1.  Trigger a release build locally.
    ```shell
    nvm install
    pnpm install --frozen-lockfile
    pnpm ng-dev release build
    ```
1.  Log in to NPM as `angular`.
    ```shell
    npm login
    ```
    - See these two Valentine entries for authentication details:
      - https://valentine.corp.google.com/#/show/1460636514618735
      - https://valentine.corp.google.com/#/show/1531867371192103
1.  Publish the release.
    ```shell
    (cd dist/releases/my-scope/my-pkg/ && npm publish --access public)
    ```
1.  Add Wombat to the package.
    ```shell
    npm owner add google-wombot @my-scope/my-pkg
    ```
1.  Don't forget to logout.
    ```shell
    npm logout
    ```
1.  File a bug like [b/336626936](http://b/336626936) to ask Wombat maintainers to
    accept the invite for the new package.

Once Wombat accepts the invite, regular automated releases should work as expected.

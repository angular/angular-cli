# Setting Up Local Repository

1. Clone the Angular-CLI repo. A local copy works just fine.
1. Create an upstream remote:

```bash
$ git remote add upstream https://github.com/angular/angular-cli.git
```

# Caretaker

The caretaker should triage issues, merge PR, and sheppard the release.

Caretaker calendar can be found [here](https://calendar.google.com/calendar/embed?src=angular.io_jf53juok1lhpm84hv6bo6fmgbc%40group.calendar.google.com&ctz=America%2FLos_Angeles).

Each shift consists of two caretakers. The primary caretaker is responsible for
merging PRs to master and patch whereas the secondary caretaker is responsible
for the release. Primary-secondary pairs are as follows:

| Primary | Secondary |
| ------- | --------- |
| Alan    | Doug      |
| Charles | Keen      |
| Filipe  | Joey      |

## Merging PRs

The list of PRs which are currently ready to merge (approved with passing status checks) can
be found with [this search](https://github.com/angular/angular-cli/pulls?q=is%3Apr+is%3Aopen+label%3A%22PR+action%3A+merge%22+-is%3Adraft).
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

To perform a release run the following and navigate the prompts:

```sh
yarn ng-dev release publish
```

## Changing shifts

If you need to update the
[caretaker calendar](https://calendar.google.com/calendar/embed?src=angular.io_jf53juok1lhpm84hv6bo6fmgbc%40group.calendar.google.com&ctz=America%2FLos_Angeles)
to modify shifts, **make sure you are logged in as your @angular.io account** and
click the "+ Google Calendar" button in the bottom right to add it to your Google
Calendar account. You should then be able to find and modify events on
calendar.google.com. The calendar is a part of the `angular.io` organization, so
events can only be modified by users in the same organization.

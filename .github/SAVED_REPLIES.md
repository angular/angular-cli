# Saved Responses for Angular CLI's Issue Tracker

The following are canned responses that the Angular CLI team should use to close issues on our issue tracker that fall into the listed resolution categories.

Since GitHub currently doesn't allow us to have a repository-wide or organization-wide list of [saved replies](https://help.github.com/articles/working-with-saved-replies/), these replies need to be maintained by individual team members. Since the responses can be modified in the future, all responses are versioned to simplify the process of keeping the responses up to date.


## Angular CLI: Already Fixed (v1)
```
Thanks for reporting this issue. Luckily, it has already been fixed in one of the recent releases. Please update to the most recent version to resolve the problem.

If the problem persists in your application after upgrading, please open a new issue, provide a simple repository reproducing the problem, and describe the difference between the expected and current behavior. You can use `ng new repro-app` to create a new project where you reproduce the problem.
```


## Angular CLI: Don't Understand (v1)
```
I'm sorry, but we don't understand the problem you are reporting.

If the problem persists, please open a new issue, provide a simple repository reproducing the problem, and describe the difference between the expected and current behavior. You can use `ng new repro-app` to create a new project where you reproduce the problem.
```


## Angular CLI: Duplicate (v1.1)
```
Thanks for reporting this issue. However, this issue is a duplicate of #<ISSUE_NUMBER>. Please subscribe to that issue for future updates.
```


## Angular CLI: Insufficient Information Provided (v1)
```
Thanks for reporting this issue. However, you didn't provide sufficient information for us to understand and reproduce the problem. Please check out [our submission guidelines](https://github.com/angular/angular-cli/blob/master/CONTRIBUTING.md#-submitting-an-issue) to understand why we can't act on issues that are lacking important information.

If the problem persists, please file a new issue and ensure you provide all of the required information when filling out the issue template.
```


## Angular CLI: NPM install issue (v1)
```
This seems like a problem with your node/npm and not with Angular CLI.

Please have a look at the [fixing npm permissions page](https://docs.npmjs.com/getting-started/fixing-npm-permissions), [common errors page](https://docs.npmjs.com/troubleshooting/common-errors), [npm issue tracker](https://github.com/npm/npm/issues), or open a new issue if the problem you are experiencing isn't known.
```


## Angular CLI: Issue Outside of Angular CLI (v1.1)
```
I'm sorry, but this issue is not caused by Angular CLI. Please contact the author(s) of the <PROJECT NAME> project or file an issue on their issue tracker.
```


## Angular CLI: Non-reproducible (v1)
```
I'm sorry, but we can't reproduce the problem following the instructions you provided.
Remember that we have a large number of issues to resolve, and have only a limited amount of time to reproduce your issue.
Short, explicit instructions make it much more likely we'll be able to reproduce the problem so we can fix it.

If the problem persists, please open a new issue following [our submission guidelines](https://github.com/angular/angular-cli/blob/master/CONTRIBUTING.md#-submitting-an-issue).

A good way to make a minimal repro is to create a new app via `ng new repro-app` and adding the minimum possible code to show the problem. Then you can push this repository to github and link it here.
```


## Angular CLI: Obsolete (v1)
```
Thanks for reporting this issue. This issue is now obsolete due to changes in the recent releases. Please update to the most recent Angular CLI version.

If the problem persists after upgrading, please open a new issue, provide a simple repository reproducing the problem, and describe the difference between the expected and current behavior.
```


## Angular CLI: Support Request (v1)
```
Hello, we reviewed this issue and determined that it doesn't fall into the bug report or feature request category. This issue tracker is not suitable for support requests, please repost your issue on [StackOverflow](http://stackoverflow.com/) using tag `angular-cli`.

If you are wondering why we don't resolve support issues via the issue tracker, please [check out this explanation](https://github.com/angular/angular-cli/blob/master/CONTRIBUTING.md#-got-a-question-or-problem).
```


## Angular CLI: Static Analysis errors (v1)
```
Hello, errors like `Error encountered resolving symbol values statically` mean that there has been some problem in statically analyzing your app.

Angular CLI always runs *some* static analysis, even in JIT mode, in order to discover lazy-loaded routes.
This may cause a lot of static analysis errors to surface when importing your project into the CLI, or upgrading for older versions where we didn't run this kind of analysis.

Below are good resources on how to to debug these errors:
- https://gist.github.com/chuckjaz/65dcc2fd5f4f5463e492ed0cb93bca60
- https://github.com/rangle/angular-2-aot-sandbox#aot-dos-and-donts

If your problem still persists, it might be a bug with the Angular Compiler itself.
In that case, please open an issue in https://github.com/angular/angular.
```

## Angular CLI: Lockfiles (v1)
```
I'd like to remind everyone that **you only have reproducible installs if you use a lockfile**. Both [NPM v5+](https://docs.npmjs.com/files/package-locks) and [Yarn](https://yarnpkg.com/lang/en/docs/yarn-lock/) support lockfiles. If your CI works one day but not the next and you did not change your code or `package.json`, it is likely because one of your dependencies had a bad release and you did not have a lockfile.

**It is your responsibility as a library consumer to use lockfiles**. No one wants to do a release with bugs but it sometimes happens, and the best we can do is to fix it as fast as possible with a new release. When you have a couple of thousand total dependencies it is only a matter of time until one of them has a bad release.
```

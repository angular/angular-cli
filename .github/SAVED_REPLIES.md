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


## Angular CLI: Duplicate (v1)
```
Thanks for reporting this issue. However, this issue is a duplicate of an existing issue #<ISSUE_NUMBER>. Please subscribe to that issue for future updates.
```


## Angular CLI: Insufficient Information Provided (v1)
```
Thanks for reporting this issue. However, you didn't provide sufficient information for us to understand and reproduce the problem. Please check out [our submission guidelines](https://github.com/angular/angular-cli/blob/master/CONTRIBUTING.md#-submitting-an-issue) to understand why we can't act on issues that are lacking important information.

If the problem persists, please file a new issue and ensure you provide all of the required information when filling out the issue template.
```

## Angular CLI: Issue Outside of Angular CLI (v1.1)
```
I'm sorry, but this issue is not caused by Angular CLI. Please contact the author(s) of the <PROJECT NAME> project or file an issue on their issue tracker.
```


## Angular CLI: Non-reproducible (v1)
```
I'm sorry, but we can't reproduce the problem following the instructions you provided.

If the problem persists, please open a new issue following [our submission guidelines](https://github.com/angular/angular-cli/blob/master/CONTRIBUTING.md#-submitting-an-issue).
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

Angular CLI always runs *some* statical analysis, even on JIT mode, in order to discover lazy-loaded routes.
This may cause a lot of static analysis errors to surface when importing your project into the CLI, or upgrading for older versions where we didn't run this kind of analysis.

Below are good resources on how to to debug these errors:
- https://gist.github.com/chuckjaz/65dcc2fd5f4f5463e492ed0cb93bca60
- https://github.com/rangle/angular-2-aot-sandbox#aot-dos-and-donts

If your problem still persists, it might be a bug with the Angular Compiler itself.
In that case, please open an issue in https://github.com/angular/angular.
```

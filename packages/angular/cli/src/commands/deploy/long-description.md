The command takes an optional project name, as specified in the `projects` section of the `angular.json` workspace configuration file.
When a project name is not supplied, executes the `deploy` builder for the default project.

To use the `ng deploy` command, use `ng add` to add a package that implements deployment capabilities to your favorite platform.
Adding the package automatically updates your workspace configuration, adding a deployment
[CLI builder](tools/cli/cli-builder).
For example:

```json
"projects": {
  "my-project": {
    ...
    "architect": {
      ...
      "deploy": {
        "builder": "@angular/fire:deploy",
        "options": {}
      }
    }
  }
}
```

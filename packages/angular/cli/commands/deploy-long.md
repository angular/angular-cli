The command is a shortcut for:

<code-example language="bash">
ng run [PROJECT_NAME]:deploy
</code-example>

It takes an optional project name, as specified in the `projects` section of the `angular.json` workspace configuration file.
When a project name is not supplied, executes the `deploy` builder for the default project.

The deploy builder defined in a deployment platform package is automatically added to a project's configuration when you add the package to the project.
For example:

```json
"projects": {
     {"my-project": {
         ...
        {"architect": {
            ...
            "deploy": {
                "builder": "@angular/fire:deploy",
                "options": {}
                    }
                }
            }
        }
    }
 }
 ```





}


    }
  }

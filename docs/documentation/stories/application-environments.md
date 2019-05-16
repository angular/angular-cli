**Documentation below is for CLI version 6 and we no longer accept PRs to improve this. For version 7 see [here](https://angular.io/guide/build#configuring-application-environments)**.

# Application Environments

In Angular CLI you can configure the build system to replace existing files for your intended
environment.

## Configuring available file replacements

`angular.json` contains an **fileReplacements** section within the production configuration of the
build target. By default, this looks like:

``` json
"configurations": {
  "production": {
    "fileReplacements": [
      {
        "replace": "src/environments/environment.ts",
        "with": "src/environments/environment.prod.ts"
      }
    ],
    ...
```

This means that when you use your production configuration (via `ng build --prod` or
`ng build --configuration=production`), the `src/environments/environment.ts` file will be replaced
with `src/environments/environment.prod.ts`.

This is useful for using different code or variables when creating a new build.
By default no file is replaced in the build.

You can add additional configurations as required.
To add a **staging** environment, create a copy of `src/environments/environment.ts` called `src/environments/environment.staging.ts`, then add a `staging` configuration to `angular.json`:

```json
"configurations": {
  "production": { ... },
  "staging": {
    "fileReplacements": [
      {
        "replace": "src/environments/environment.ts",
        "with": "src/environments/environment.staging.ts"
      }
    ]
  }
}
```

You can add more configuration options to this environment as well.
Any option that your build supports can be overriden in a configuration.

To build using the staging configuration, run `ng build --configuration=staging`.

To serve using the staging configuration, you must edit the `serve` target to use the `staging`
build configuration:
```json
"serve": {
  "builder": "@angular-devkit/build-angular:dev-server",
  "options": {
    "browserTarget": "your-project-name:build"
  },
  "configurations": {
    "production": {
      "browserTarget": "your-project-name:build:production"
    },
    "staging": {
      "browserTarget": "your-project-name:build:staging"
    }
  }
},
```

## Changing environment-specific files

`environment.ts` contains the default settings.  If you take a look at this file, it should look like:

``` TypeScript
export const environment = {
  production: false
};
```

If you compare this to `environment.prod.ts`, which looks like:

``` TypeScript
export const environment = {
  production: true
};
```

You can add further variables, either as additional properties on the `environment` object, or as separate objects, for example:

``` TypeScript
export const environment = {
  production: false,
  apiUrl: 'http://my-api-url'
};
```

## Using environment-specific variables in your application

Given the following application structure:

```
└── src
    └── app
        ├── app.component.html
        └── app.component.ts
    └── environments
        ├── environment.prod.ts
        ├── environment.staging.ts
        └── environment.ts
```

Using environment variables inside of `app.component.ts` might look something like this:

``` TypeScript
import { Component } from '@angular/core';
import { environment } from './../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor() {
    console.log(environment.production); // Logs false for default environment
  }
  title = 'app works!';
}
```

You will always import the original environments file.
This way the build system can replace the original in each configuration.


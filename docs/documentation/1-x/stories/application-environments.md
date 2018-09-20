# Application Environments

## Configuring available environments

`.angular-cli.json` contains an **environments** section.  By default, this looks like:

``` json
"environments": {
    "dev": "environments/environment.ts",
    "prod": "environments/environment.prod.ts"
}
```

You can add additional environments as required.  To add a **staging** environment, your configuration would look like:

``` json
"environments": {
    "dev": "environments/environment.ts",
    "staging": "environments/environment.staging.ts",
    "prod": "environments/environment.prod.ts"
}
```

## Adding environment-specific files

The environment-specific files are set out as shown below:

```
└── src
    └── environments
        ├── environment.prod.ts
        └── environment.ts
```

If you wanted to add another environment for **staging**, your file structure would become:

```
└── src
    └── environments
        ├── environment.prod.ts
        ├── environment.staging.ts
        └── environment.ts
```

## Amending environment-specific files

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

## Environment-specific builds

Running:

```
ng build
```

Will use the defaults found in `environment.ts`

Running:

```
ng build --env=staging
```

Will use the values from `environment.staging.ts`

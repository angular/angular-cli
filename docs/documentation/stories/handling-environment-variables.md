# Handling environment variables

## Configuring available environments

`.angular-cli.json` contains an **environments** section.  By default, this looks like:

``` json
"environments": {
    "dev": "environments/environment.ts",
    "prod": "environments/environment.prod.ts"
}
```

You can add additional environments as required.  To add a **test** environment, your configuration would look like:

``` json
"environments": {
    "dev": "environments/environment.ts",
    "test": "environments/environment.test.ts",
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

If you wanted to add another environment for **test**, your file structure would become:

```
└── src
    └── environments
        ├── environment.prod.ts
        ├── environment.test.ts
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

Simply import the environment into your file, for example:

``` TypeScript
import { environment } from './../../environments/environment';
```

And later in your code:

``` TypeScript
console.log(environment.production); // Logs false for default environment
```

## Environment-specific builds

Running:

```
ng build
```

Will use the defaults found in `environment.ts`

Running:

```
ng build --env=test
```

Will use the values from `environment.test.ts`

**Documentation below is for CLI version 6 and we no longer accept PRs to improve this. For version 7 see [here](https://angular.io/guide/i18n)**.

# Internationalization (i18n)

If you are working on internationalization, the CLI can help you with the following steps:
- extraction
- serve
- build

The first thing that you have to do is to setup your application to use i18n.
To do that you can follow [the cookbook on angular.io](https://angular.io/guide/i18n).

### Extraction
When your app is ready, you can extract the strings to translate from your templates with the
`ng xi18n` command.

By default it will create a file named `messages.xlf` in your `src` folder.
You can use [parameters from the xi18n command](./xi18n) to change the format,
the name, the location and the source locale of the extracted file.

For example to create a file in the `src/locale` folder you would use:
```sh
ng xi18n --output-path src/locale
```

### Building and serving
Now that you have generated a messages bundle source file, you can translate it.
Let's say that your file containing the french translations is named `messages.fr.xlf`
and is located in the `src/locale` folder.

If you want to use it when you serve your application you can use the 4 following options:
- `i18nFile` Localization file to use for i18n.
- `i18nFormat` Format of the localization file specified with --i18n-file.
- `i18nLocale` Locale to use for i18n.
- `i18nMissingTranslation` Defines the strategy to use for missing i18n translations.

In our case we can load the french translations with the following configuration:
```json
"architect": {
  "build": {
    "builder": "@angular-devkit/build-angular:browser",
    "options": { ... },
    "configurations": {
      "fr": {
        "aot": true,
        "outputPath": "dist/my-project-fr/",
        "i18nFile": "src/locale/messages.fr.xlf",
        "i18nFormat": "xlf",
        "i18nLocale": "fr",
        "i18nMissingTranslation": "error",
      }
// ...
"serve": {
  "builder": "@angular-devkit/build-angular:dev-server",
  "options": {
    "browserTarget": "your-project-name:build"
  },
  "configurations": {
    "production": {
      "browserTarget": "your-project-name:build:production"
    },
    "fr": {
      "browserTarget": "your-project-name:build:fr"
    }
  }
},
```

To build the application using the French i18n options, use `ng build --configuration=fr`.
To serve, use `ng serve --configuration=fr`.

Our application is exactly the same but the `LOCALE_ID` has been provided with "fr",
`TRANSLATIONS_FORMAT` with "xlf" and `TRANSLATIONS` with the content of `messages.fr.xlf`.
All the strings flagged for i18n have been replaced with their french translations.

Note: this only works for AOT, if you want to use i18n in JIT you will have to update
your bootstrap file yourself.

### Using multiple languages

When you build your application for a specific locale, it is probably a good idea to change
the output path with the `outputPath` options in order to save the files to a different location.

If you end up serving this specific version from a subdirectory, you can also change
the base url used by your application with the `baseHref` option.

For example if the french version of your application is served from https://myapp.com/fr/
then you would build the french version like this:

```json
"configurations": {
  "fr": {
    "aot": true,
    "outputPath": "dist/my-project-fr/",
    "baseHref": "/fr/",
    "i18nFile": "src/locale/messages.fr.xlf",
    "i18nFormat": "xlf",
    "i18nLocale": "fr",
    "i18nMissingTranslation": "error",
  }
```

If you need more details about how to create scripts to generate the app in multiple
languages and how to setup Apache 2 to serve them from different subdirectories,
you can read [this great tutorial](https://medium.com/@feloy/deploying-an-i18n-angular-app-with-angular-cli-fc788f17e358#.1xq4iy6fp)
by Philippe Martin.

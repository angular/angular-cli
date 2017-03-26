# Internationalization (i18n)

If you are working on internationalization, the CLI can help you with the following steps: 
- extraction
- serve
- build

The first thing that you have to do is to setup your application to use i18n.
To do that you can follow [the cookbook on angular.io](https://angular.io/docs/ts/latest/cookbook/i18n.html).

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

### Serve
Now that you have generated a messages bundle source file, you can translate it.
Let's say that your file containing the french translations is named `messages.fr.xlf` 
and is located in the `src/locale` folder.
If you want to use it when you serve your application you can use the 3 following commands:
- `--i18n-file` Localization file to use for i18n.
- `--i18n-format` Format of the localization file specified with --i18n-file.
- `--locale` Locale to use for i18n.

In our case we can load the french translations with the following command:
```sh
ng serve --aot --locale fr --i18n-format xlf --i18n-file src/locale/messages.fr.xlf
```

Our application is exactly the same but the `LOCALE_ID` has been provided with "fr",
`TRANSLATIONS_FORMAT` with "xlf" and `TRANSLATIONS` with the content of `messages.fr.xlf`.
All the strings flagged for i18n have been replaced with their french translations.

Note: this only works for AOT, if you want to use i18n in JIT you will have to update
your bootstrap file yourself.

### Build
To build your application with a specific locale you can use the exact same commands
that you used for `serve`:
```sh
ng build --aot --locale fr --i18n-format xlf --i18n-file src/i18n/messages.fr.xlf
```

When you build your application for a specific locale, it is probably a good idea to change
the output path with the command `--output-path` in order to save the files to a different location.

```sh
ng build --aot --output-path dist/fr --locale fr --i18n-format xlf --i18n-file src/i18n/messages.fr.xlf
```

If you end up serving this specific version from a subdirectory, you can also change
the base url used by your application with the command `--base-href`.

For example if the french version of your application is served from https://myapp.com/fr/
then you would build the french version like this:

```sh
ng build --aot --output-path dist/fr --base-href fr --locale fr --i18n-format xlf --i18n-file src/i18n/messages.fr.xlf
```

If you need more details about how to create scripts to generate the app in multiple
languages and how to setup Apache 2 to serve them from different subdirectories,
you can read [this great tutorial](https://medium.com/@feloy/deploying-an-i18n-angular-app-with-angular-cli-fc788f17e358#.1xq4iy6fp)
by Philippe Martin.

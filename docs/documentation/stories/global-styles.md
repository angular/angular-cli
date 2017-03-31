# Global styles

The `styles.css` file allows users to add global styles and supports
[CSS imports](https://developer.mozilla.org/en/docs/Web/CSS/@import).

If the project is created with the `--style=sass` option, this will be a `.sass`
file instead, and the same applies to `scss/less/styl`.

You can add more global styles via the `apps[0].styles` property in `.angular-cli.json`.
These will be loaded exactly as if you had added them in a `<link>` tag inside `index.html`.

```json
"styles": [
  "styles.css",
  "more-styles.css",
],
```

You can also use object format to do more advanced things:
- `input` (required) - file path
- `lazy` - flag to indicate if to lazy load it
- `output` - the output bundle name
- `env` - the environment to be included in

```json
"styles": [
  "styles.css",
  "more-styles.css",
  { "input": "lazy-style.scss", "lazy": true },
  { "input": "pre-rename-style.scss", "output": "renamed-style" },
  { "input": "production-style.scss", "env": "prod" }
],
```

In Sass and Stylus you can also make use of the `includePaths` functionality for both component and
global styles, which allows you to add extra base paths that will be checked for imports.

To add paths, use the `stylePreprocessorOptions` entry in angular-cli.json `app` object:

```
"stylePreprocessorOptions": {
  "includePaths": [
    "style-paths"
  ]
},
```

Files in that folder, e.g. `src/style-paths/_variables.scss`, can be imported from anywhere in your
project without the need for a relative path:

```
// src/app/app.component.scss
// A relative path works
@import '../style-paths/variables';
// But now this works as well
@import 'variables';
```
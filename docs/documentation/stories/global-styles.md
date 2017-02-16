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

You can also rename the output and lazy load it by using the object format:

```json
"styles": [
  "styles.css",
  "more-styles.css",
  { "input": "lazy-style.scss", "lazy": true },
  { "input": "pre-rename-style.scss", "output": "renamed-style" },
],
```

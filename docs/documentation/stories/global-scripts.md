# Global scripts

You can add Javascript files to the global scope via the `apps[0].scripts`
property in `.angular-cli.json`.
These will be loaded exactly as if you had added them in a `<script>` tag inside `index.html`.

This is especially useful for legacy libraries or analytic snippets.

```json
"scripts": [
  "global-script.js",
],
```

You can also rename the output and lazy load it by using the object format:

```json
"scripts": [
  "global-script.js",
  { "input": "lazy-script.js", "lazy": true },
  { "input": "pre-rename-script.js", "output": "renamed-script" },
],
```

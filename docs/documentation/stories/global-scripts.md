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

## Using global libraries inside your app

Once you import a library via the scripts array, you should **not** import it via a import statement
in your TypeScript code (e.g. `import * as $ from 'jquery';`).
If you do that, you'll end up with two different copies of the library: one imported as a
global library, and one imported as a module.

This is especially bad for libraries with plugins, like JQuery, because each copy will have
different plugins.

Instead, download typings for your library (`npm install @types/jquery`) which will give you
access to the global variables exposed by that library.

If the global library you need to use does not have global typings, you can also declare them
manually in `src/typings.d.ts` as `any`:

```
declare var libraryName: any;
```
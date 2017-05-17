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

Instead, download typings for your library (`npm install @types/jquery`) and follow
the [3rd Party Library Installation](https://github.com/angular/angular-cli/wiki/stories-third-party-lib) steps,
this will give you access to the global variables exposed by that library.

If the global library you need to use does not have global typings, you can also declare them
manually in `src/typings.d.ts` as `any`:

```
declare var libraryName: any;
```

When working with scripts that extend other libraries, for instance with JQuery plugins
(e.g, `$('.test').myPlugin();`), since the installed `@types/jquery` may not include `myPlugin`,
you would need to add an interface like the one below in `src/typings.d.ts`.

```
interface JQuery {
  myPlugin(options?: any): any;
}
```

Otherwise you may see `[TS][Error] Property 'myPlugin' does not exist on type 'JQuery'.` in your IDE.

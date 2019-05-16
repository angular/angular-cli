# 3rd Party Library Installation

Simply install your library via `npm install lib-name --save` and import it in your code.

If the library does not include typings, you can install them using npm:

```bash
npm install d3 --save
npm install @types/d3 --save-dev
```

Then open `src/tsconfig.app.json` and add it to the `types` array:

```
"types":[
  "d3"
]
```

If the library you added typings for is only to be used on your e2e tests,
instead use `e2e/tsconfig.e2e.json`.
The same goes for unit tests and `src/tsconfig.spec.json`.

If the library doesn't have typings available at `@types/`, you can still use it by
manually adding typings for it:

1. First, create a `typings.d.ts` file in your `src/` folder. This file will be automatically included as global type definition.

2. Then, in `src/typings.d.ts`, add the following code:

  ```typescript
  declare module 'typeless-package';
  ```

3. Finally, in the component or file that uses the library, add the following code:

  ```typescript
  import * as typelessPackage from 'typeless-package';
  typelessPackage.method();
  ```

Done. Note: you might need or find useful to define more typings for the library that you're trying to use.

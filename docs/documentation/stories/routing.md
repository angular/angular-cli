**Documentation below is for CLI version 6 and we no longer accept PRs to improve this. For version 7 see [here](https://angular.io/guide/router#integrate-routing-with-your-app)**.

# Generating a route

The CLI supports routing in several ways:

- We include the `@angular/router` NPM package when creating or initializing a project.

- When you generate a module, you can use the `--routing` option like `ng g module my-module --routing`  to create a separate file `my-module-routing.module.ts` to store the module routes.

  The file includes an empty `Routes` object that you can fill with routes to different components and/or modules.

- You can use the `--routing` option with `ng new` to create a `app-routing.module.ts` file when you create or initialize a project.

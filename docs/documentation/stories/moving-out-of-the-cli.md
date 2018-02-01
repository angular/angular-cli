# Moving your project out of Angular CLI

Each project is unique, and even though we try to cater to most setups in Angular CLI sometimes
you need a custom setup.

Even if you need to use a different build system, you can still use other Angular CLI features
like `ng generate`, `ng lint`, `ng test` and `ng e2e` by leaving in `.angular-cli.json` and
supporting files like `src/test.ts`.

Moving out of the CLI is very similar to [Moving into the CLI](moving-into-the-cli).
You'll have to make a brand new project using your new project seed, move your app files and
cater to any changes in the build process.

Start with preparing your existing project folder. We'll refer to it as `awesome-app`.
- commit and push your existing changes.
- clean your folder from temporary files and ignored files using `git clean -fdx`.
- rename your project folder to `old-awesome-app`.

Now make a new project on the same parent folder as `old-awesome-app`.
- Make a new app using your new project seed in a new `awesome-app` folder.
- Move into the folder: `cd awesome-app`.

Copy over your app files.
- Locate `app/`, `styles.css` and the end-to-end test folder in your new project.
- Replace them with the corresponding files from `../old-awesome-app`.
- If your styles are not in CSS, you'll need to convert them to CSS since the quickstart doesn't
use style preprocessors. You can also add preprocessor support yourself.
- Copy over the code your app needs from the `environments/` folder, if any.
You'll have to find another way to switch environments on the Quickstart.
- Don't copy `../old-awesome-app/src/main.ts`. It contains custom logic for the CLI
`environments` feature. Instead compare code and take only what you need.
- Do the same for `index.html`.
- Compare `../old-awesome-app/package.json` to the new `./package.json` and add in your
third party libraries and `@types/*` packages, project descriptions and any other fields.
- Run `npm install` to install any packages you added.
- Copy over any other files your app needs like images, icons, etc.

You might also need to make adjustments to conform to your new build system.
- The CLI only allows relative paths in `templateUrl`, `styleUrls` or lazy loaded NgModules.
You might need to change these.
- Polyfills are listed in `../old-awesome-app/src/polyfills.ts`. Incorporate these into the new
project.
- The CLI lists used `<script>` and `<link>` tags in the `.angular-cli.json` `scripts`
and `styles` array. Check import these in your new project and add them accordingly.

The final step is to copy your git history so you can continue working without losing anything:
- Copy over the git folder: `cp -r ../old-awesome-app/.git .git`
- Commit and push your changes as normal.

You can now delete `../old-awesome-app`, and you're done!

Every project seed does things slightly different so if you are running into problems be sure
to ask in their issue tracker.

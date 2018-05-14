# Moving your project to Angular CLI

The easiest way to move an existing project to Angular CLI is to copy your
application files into a new, empty CLI project.

Let's see how to do it step by step.
Here we use a project made with the [official QuickStart](https://github.com/angular/quickstart)
as an example, but you should be able to adjust these instructions to other setups.

Note for Windows users: we show unix commands here like `cp -r` to copy and `rm -rf` to delete files.
Windows does not have these commands so use Explorer instead.

Start with preparing your existing project folder. We'll refer to it as `awesome-app`.
- commit and push your existing changes.
- clean your folder from temporary files and ignored files using `git clean -fdx`.
- rename your project folder to `old-awesome-app`.

Now make a new project on the same parent folder as `old-awesome-app` using Angular CLI.
- Verify you have the [Angular CLI prerequisites](https://github.com/angular/angular-cli#prerequisites).
- Install the CLI globally: `npm install -g @angular/cli`.
- Make a new app: `ng new awesome-app`.
- Move into the folder: `cd awesome-app`.
- Test your app works: `ng serve --open`.

Copy over your app files.
- Remove the existing app: `rm -rf src/app src/styles.css src/index.html e2e`.
- Copy `src/app/`, `src/index.html`, `src/styles.css` and `e2e/` from your old app.
If you don't have a `src/` folder then these files and folders should be
at the root of the old project instead.
```
cp -r ../old-awesome-app/src/app ./src/app
cp ../old-awesome-app/src/index.html ./src/index.html
cp ../old-awesome-app/src/styles.css ./src/styles.css
cp -r ../old-awesome-app/e2e ./e2e/
```
- Don't copy `../old-awesome-app/src/main.ts`. Instead compare it to the new `./src/main.ts`
and manually copy any extra code the old one has.
- Compare `../old-awesome-app/package.json` to the new `./package.json` and add in your
third party libraries and `@types/*` packages, project descriptions and any other fields.
- Run `npm install` to install any packages you added.
- Copy over any other files your app needs like images into `src/assets`.
Adjust paths on your app to use this folder e.g. `<img src='assets/my-image.jpg>`.

There are a few adjustments you need to do to use the CLI build system.
- Change any absolute paths you have for `templateUrl`, `styleUrls` or lazy loaded NgModules to
relative paths instead.
- Remove any `module.id` that you have in `@Component` metadata. They aren't needed in the CLI.
- Polyfills are listed in `./src/polyfills.ts` so remove `core-js` and `zone.js` from `index.html`.
- SystemJS is not needed anymore, so remove it from `index.html` as well.
- Instead of using `<script>` and `<link>` tags directly in `index.html`, use
`.angular-cli.json` instead.
  - Look for the `styles` array in `.angular-cli.json` and add in any CSS files you have in
`src/index.html`. Use a relative path from `./src/`.
  - Do the same for any remaining script tags as well, using the `scripts` array instead.

The final step is to copy your git history so you can continue working without losing anything:
- Copy over the git folder: `cp -r ../old-awesome-app/.git .git`
- Commit and push your changes as normal.

You can now delete `../old-awesome-app`, and you're done!

The CLI runs static analysis on your code to ensure it's AOT ready, so you might run into a few
new compilation errors that weren't there before.
Check out this [handy list of AOT Do's and Dont's](https://github.com/rangle/angular-2-aot-sandbox#aot-dos-and-donts)
if you get any unfamiliar errors.

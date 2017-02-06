# Moving your project to Angular CLI

It's easy to move your existing project to use Angular CLI.
The most straightforward way is to to make a new CLI project and copy over your app files.

Let's see how to do it step by step.
Here we use a project made with the [official QuickStart](https://github.com/angular/quickstart)
as an example, but you should be able to adjust these instructions to other setups.

Note for Windows users: we show unix commands here like `cp` to copy and `rm -rf` to delete files.
Windows does not have these commands so use Explorer instead.

Start with preparing your existing project folder, let's call it `awesome-app`.
- commit and push your existing changes.
- clean your folder from temporary files and ignored files using `git clean -fdx`.
- rename your project folder to `old-awesome-app`.

Now make a new project on the same folder as `old-awesome-app` using Angular CLI.
- Read up on [Angular CLI prerequisites](https://github.com/angular/angular-cli#prerequisites).
- Install the CLI globally: `npm install -g @angular/cli`.
- Make a new app: `ng new awesome-app`.
- Move into the folder: `cd awesome-app`.
- Test your app works: `ng serve --open`.

Copy over your app files.
- Remove the existing app: `rm -rf src/app src/styles.css src/index.html e2e`.
- Copy `src/app/`, `src/index.html`, `src/styles.css` and `e2e/`.
If you don't have a `src/` folder then these files and folders should be
at the root of the old project instead.
```
cp ../old-awesome-project/src/app ./src/app
cp ../old-awesome-project/src/index.html ./src/index.html
cp ../old-awesome-project/src/styles.css ./src/styles.css
cp ../old-awesome-project/e2e ./e2e/
```
- Don't copy `../old-awesome-project/src/main.ts`. Instead compare it to the new `./src/main.ts`
and manually copy any extra code the old one has.
- Compare `../old-awesome-project/package.json` to the new `./package.json` and add in your
third party libraries and `@types/*` packages, project descriptions and any other fields.
- Run `npm install` to install any packages you added.
- Copy over any other files your app needs like images, icons, etc.

There are a few adjustments you need to do to use the CLI build system.
- Change any absolute paths you have for `templateUrl`, `styleUrls` or lazy loaded NgModules to
relative paths instead.
- Polyfills are listed in `./src/polyfills.ts` so remove `core-js` and `zone.js` from `index.html`.
- SystemJS is not needed anymore, so remove it from `index.html` as well.
- Instead of using `<script>` and `<link>` tags directly in `index.html`, use
`angular-cli.json` instead.
  - Look for the `styles` array in `angular-cli.json` and add in any CSS files you have in
`src/index.html`. Use a relative path from `./src/`.
  - Do the same for any remaining script tags as well, using the `scripts` array instead.

The final step is to copy your git history so you can continue working without losing anything:
- Copy over the git folder: `cp ../old-awesome-project/.git .git`
- Commit and push your changes as normal.

You can now delete `../old-existing-project`, and you're done!

The CLI runs static analysis on your code to ensure it's AOT ready, so you might run into a few
new compilation errors that weren't there before.
Check out this [handy list of AOT Do's and Dont's](https://github.com/rangle/angular-2-aot-sandbox#aot-dos-and-donts)
if you get any unfamiliar errors.

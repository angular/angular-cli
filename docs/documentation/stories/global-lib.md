**Documentation below is deprecated and we no longer accept PRs to improve this. The new documentation will be available here [angular.io](https://angular.io/guide/build)**.

# Global Library Installation

Some javascript libraries need to be added to the global scope and loaded as if
they were in a script tag.
We can do this using the `scripts` and `styles` options of the build target in `angular.json`.

As an example, to use [Bootstrap 4](https://getbootstrap.com/docs/4.0/getting-started/introduction/)
this is what you need to do:

First install Bootstrap from `npm`:

```bash
npm install jquery --save
npm install popper.js --save
npm install bootstrap --save
```

Then add the needed script files to `scripts`:

```json
"scripts": [
  "node_modules/jquery/dist/jquery.slim.js",
  "node_modules/popper.js/dist/umd/popper.js",
  "node_modules/bootstrap/dist/js/bootstrap.js"
],
```

Finally add the Bootstrap CSS to the `styles` array:
```json
"styles": [
  "node_modules/bootstrap/dist/css/bootstrap.css",
  "src/styles.css"
],
```

Restart `ng serve` if you're running it, and Bootstrap 4 should be working on your app.

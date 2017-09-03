# Global Library Installation

Some javascript libraries need to be added to the global scope, and loaded as if
they were in a script tag. We can do this using the `apps[0].scripts` and
`apps[0].styles` properties of `.angular-cli.json`.

As an example, to use [Bootstrap 4](https://getbootstrap.com/docs/4.0/getting-started/introduction/) this is
what you need to do:

First install Bootstrap from `npm`:

```bash
npm install jquery --save
npm install popper.js --save
npm install bootstrap@next --save
```

Then add the needed script files to `apps[0].scripts`:

```json
"scripts": [
  "../node_modules/jquery/dist/jquery.slim.js",
  "../node_modules/popper.js/dist/umd/popper.js",
  "../node_modules/bootstrap/dist/js/bootstrap.js"
],
```

Finally add the Bootstrap CSS to the `apps[0].styles` array:
```json
"styles": [
  "../node_modules/bootstrap/dist/css/bootstrap.css",
  "styles.css"
],
```

Restart `ng serve` if you're running it, and Bootstrap 4 should be working on
your app.

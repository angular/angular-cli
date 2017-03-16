<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# Include [Font Awesome](http://fontawesome.io/)

[Font Awesome](http://fontawesome.io/) gives you scalable vector icons that can instantly be customized — size, color, drop shadow, and anything that can be done with the power of CSS.

Create a new project and navigate into the project...
```
ng new my-app
cd my-app
```

Install the `font-awesome` library and add the dependency to package.json...
```bash
npm install --save font-awesome
```

### Using CSS

To add Font Awesome CSS icons to your app...
```json
// in .angular-cli.json

"styles": [
  "styles.css",
  "../node_modules/font-awesome/css/font-awesome.css"
]
```
### Using SASS

Create an empty file _variables.scss in src/.

Add the following to _variables.scss:

```
$fa-font-path : '../node_modules/font-awesome/fonts';
```
In styles.scss add the following:

```
@import 'variables';
@import '../node_modules/font-awesome/scss/font-awesome';
```
### Test

Run `ng serve` to run your application in develop mode, and navigate to `http://localhost:4200`.

To verify Font Awesome has been set up correctly, change `src/app/app.component.html` to the following...
```html
<h1>
  {{title}} <i class="fa fa-check"></i>
</h1>
```

After saving this file, return to the browser to see the Font Awesome icon next to the app title.

### More Info

- [Examples](http://fontawesome.io/examples/)

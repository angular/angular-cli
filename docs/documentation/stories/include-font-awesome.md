<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->
**Documentation below is deprecated and we no longer accept PRs to improve this.**

# Include [Font Awesome](https://fontawesome.com/)

[Font Awesome](https://fontawesome.com/) gives you scalable vector icons that can instantly be customized — size, color, drop shadow, and anything that can be done with the power of CSS.

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
// in angular.json
"build": {
  "options": {
    "styles": [
      "../node_modules/font-awesome/css/font-awesome.css",
      "src/styles.css"
    ],
  }
}
```
### Using SASS
Create new project with SASS:
```
ng new cli-app --style=scss
```
To use with existing project with `CSS`:
1. Rename `src/styles.css` to `src/styles.scss`
2. Change `angular.json` to look for `styles.scss` instead of css:
```
// in angular.json
"build": {
  "options": {
    "styles": [
      "src/styles.scss"
    ],
  }
}
```
Make sure to change `styles.css` to `styles.scss`.

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

- [Examples](https://fontawesome.com/how-to-use/on-the-web/setup/getting-started?using=web-fonts-with-css)

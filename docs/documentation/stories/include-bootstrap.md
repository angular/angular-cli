<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# Include [Bootstrap](http://getbootstrap.com/)

[Bootstrap](https://getbootstrap.com/) is a popular CSS framework which can be used within an Angular project.
This guide will walk you through adding bootstrap to your Angular CLI project and configuring it to use bootstrap.

## Using CSS

### Getting Started

Create a new project and navigate into the project

```
ng new my-app
cd my-app
```

### Installing Bootstrap

With the new project created and ready you will next need to install bootstrap to your project as a dependency.
Using the `--save` option the dependency will be saved in package.json

```sh
# version 3.x
npm install bootstrap --save

# version 4.x
npm install bootstrap@next --save
```

### Configuring Project

Now that the project is set up it must be configured to include the bootstrap CSS.

- Open the file `.angular-cli.json` from the root of your project.
- Under the property `apps` the first item in that array is the default application.
- There is a property `styles` which allows external global styles to be applied to your application.
- Specify the path to `bootstrap.min.css`

  It should look like the following when you are done:
  ```json
  "styles": [
    "../node_modules/bootstrap/dist/css/bootstrap.min.css",
    "styles.css"
  ],
  ```
  
### Adding full Bootstrap component JS support

```json

// version 4

**Note:** from Bootstrap site 
  
Some plugins and CSS components depend on other plugins. If you include plugins individually, 
make sure to check for these dependencies in the docs. Also note that all plugins depend on 
jQuery (this means jQuery must be included before the plugin files).
Consult our bower.json to see which versions of jQuery are supported.
https://v4-alpha.getbootstrap.com/getting-started/javascript/

In `.angular-cli.json` add the following lines to the scripts section:

# version 4.x
  "scripts": [
  	"../node_modules/jquery/dist/jquery.js",
    "../node_modules/tether/dist/js/tether.js",
    "../node_modules/bootstrap/dist/js/bootstrap.js",
  ]
```
**Note:** When you make changes to `.angular-cli.json` you will need to re-start `ng serve` to pick up configuration changes.

### Other Bootstrap component libaries

 - ng bootstrap https://ng-bootstrap.github.io (version 4.x only)
 - ng2 bootstrap http://valor-software.com/ng2-bootstrap/ (version 3.x & 4.x)
 
You should check with the libraries for instructions how to include their project with Angular-cli. You probably only need to 
include the above CSS instructions, the JS/TS part will be provided by the library themself.


### Testing Project

Open `app.component.html` and add the following markup:

```html
<button class="btn btn-primary">Test Button</button>
```

With the application configured, run `ng serve` to run your application in develop mode.
In your browser navigate to the application `localhost:4200`.
Verify the bootstrap styled button appears.

## Using SASS

### Getting Started

Create a new project and navigate into the project

```
ng new my-app --style=scss
cd my-app
```

### Installing Bootstrap

```sh
# version 3.x
npm install bootstrap-sass --save

# version 4.x
npm install bootstrap@next --save
```

### Configuring Project

Create an empty file `_variables.scss` in `src/`.

If you are using `bootstrap-sass`, add the following to `_variables.scss`:

```sass
$icon-font-path: '../node_modules/bootstrap-sass/assets/fonts/bootstrap/';
```

In `styles.scss` add the following:

```sass
// version 3
@import 'variables';
@import '../node_modules/bootstrap-sass/assets/stylesheets/_bootstrap';

// version 4
@import 'variables';
@import '../node_modules/bootstrap/scss/bootstrap';
```

### Testing Project

Open `app.component.html` and add the following markup:

```html
<button class="btn btn-primary">Test Button</button>
```

With the application configured, run `ng serve` to run your application in develop mode.
In your browser navigate to the application `localhost:4200`.
Verify the bootstrap styled button appears.
To ensure your variables are used open `_variables.scss` and add the following:

```sass
$brand-primary: red;
```

Return the browser to see the font color changed.

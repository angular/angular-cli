# Include [Bootstrap](http://getbootstrap.com/)

[Bootstrap](http://getbootstrap.com/) is a popular CSS framework which can be used within an Angular project.
This guide will walk you through adding bootstrap to your Angular CLI project and configuring it to use bootstrap.

Create a new project and navigate into the project
```
ng new my-app
cd my-app
```

With the new project created and ready you will next need to install bootstrap to your project as a dependency.
Using the `--save` option the dependency will be saved in package.json
```
// version 3.x
npm install bootstrap --save

// version 4.x
npm install bootstrap@next --save
```

Now that the project is set up it must be configured to include the bootstrap CSS.

Open the file `angular-cli.json` from the root of your project.
Under the property `apps` the first item in that array is the default application.
There is a property `styles` which allows external global styles to be applied to your application.
Specify the path to `bootstrap.min.css`
```
// version 3.x and 4.x
"../node_modules/bootstrap/dist/css/bootstrap.min.css"
```

With the application configured, run `ng serve` to run your application in develop mode.
In your browser navigate to the application `localhost:4200`.
Make a change to your application to ensure that the CSS library has been included.
A quick test is to add the following markup to `app.component.html`
```
<button class="btn btn-primary">Test Button</button>
```
After saving this file, return to the browser to see the bootstrap styled button.


**Note:** When you make changes to `angular-cli.json` you will need to re-start `ng serve` to pick up configuration changes.

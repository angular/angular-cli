# Include [Angular Material](https://material.angular.io)

[Angular Material](https://material.angular.io) is a set of Material Design components for Angular apps.
This guide will walk you through adding material design to your Angular CLI project and configuring it to use Angular Material.

Create a new project and navigate into the project...
```
ng new my-app
cd my-app
```

Install the `@angular/material` library and add the dependency to package.json...
```bash
npm install --save @angular/material @angular/cdk
```

Import the Angular Material NgModule into your app module...
```javascript
//in src/app/app.module.ts

import { MaterialModule } from '@angular/material';
// other imports

@NgModule({
  imports: [
    ...
    MaterialModule
  ],
  ...
})
```

Now that the project is set up, it must be configured to include the CSS for a theme. Angular Material ships with some prebuilt theming, which is located in `node_modules/@angular/material/prebuilt-themes/`.

To add an angular CSS theme and material icons to your app...
```sass
/* in src/styles.css */

@import '~@angular/material/prebuilt-themes/deeppurple-amber.css';
@import '~https://fonts.googleapis.com/icon?family=Material+Icons';
```

Run `ng serve` to run your application in development mode, and navigate to `http://localhost:4200`.

To verify Angular Material has been set up correctly, change `src/app/app.component.html` to the following...
```html
<h1>
  {{title}}
</h1>

<button md-raised-button>
  Angular Material works!
  <md-icon>done</md-icon>
</button>
```

After saving this file, return to the browser to see the Angular Material styled button.

### More Info

 - [Getting Started](https://material.angular.io/guide/getting-started)
 - [Theming Angular Material](https://material.angular.io/guide/theming)
 - [Theming your own components](https://material.angular.io/guide/theming-your-components)

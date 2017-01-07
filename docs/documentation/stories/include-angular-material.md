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
npm install --save @angular/material
```

Import the Angular Material NgModule into your app module...
```javascript
//in src/app/app.module.ts 

import { MaterialModule } from '@angular/material';
// other imports 

@NgModule({
  imports: [
    ...
    MaterialModule.forRoot()
  ],
  ...
})
```

Now that the project is set up, it must be configured to include the CSS for a theme. Angular Material ships with some prebuilt theming, which is located in `node_modules/@angular/material/core/theming/prebuilt`.

To add an angular CSS theme and material icons to your app...
```sass
/* in src/styles.css */

@import '~@angular/material/core/theming/prebuilt/deeppurple-amber.css';
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

# Include [Flex Layout](https://github.com/angular/flex-layout) for [Angular Material](https://material.angular.io)

Include Angular Material as detailed above.

Install the `@angular/flex-layout` library and add the dependency to package.json...
```bash
npm install --save @angular/flex-layout
```

Import the Angular Flex-Layout NgModule into your app module...
```javascript
//in src/app/app.module.ts 

import { FlexLayoutModule } from '@angular/flex-layout';
// other imports 

@NgModule({
  imports: [
    ...
    FlexLayoutModule.forRoot()
  ],
  ...
})
```

Run `ng serve` to run your application in develop mode, and navigate to `http://localhost:4200`

Add the following to `src/app/app.component.css`...
```css
.header {
  background-color: lightyellow;
}

.left {
  background-color: lightblue;
}

.right {
  background-color: pink;
}
```

To verify flex-layout has been set up correctly, change `src/app/app.component.html` to the following...
```html
<div fxLayout="column">

  <div class="header" fxLayout="row" fxLayoutAlign="space-between center">

    <h1>
      {{title}}
    </h1>

    <button md-raised-button>
      Angular Material works! 
      <md-icon>done</md-icon>
    </button>

  </div>

  <div fxLayout="row">

    <div class="left" fxFlex="20">
      LEFT: 20% wide
    </div>

    <div class="right" fxFlex>
      RIGHT: 80% wide
    </div>

  </div>
</div>
```

After saving this file, return to the browser to see the very ugly but demonstrative flex-layout.

Among what you should see are - a light yellow header that is the entire width of the window, sitting directly atop 2 columns. Of those 2 columns, the left column should be light blue, and 20% wide, while the right column is pink, 80% to start, and will flex with window (re)size.

### More Info 

 - [Installation](https://github.com/angular/flex-layout#installation)
 - [API Overview](https://github.com/angular/flex-layout/wiki/API-Overview)
 - [Demo](https://tburleson-layouts-demos.firebaseapp.com/#/docs)

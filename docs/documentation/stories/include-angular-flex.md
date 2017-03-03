# Include [Flex Layout](https://github.com/angular/flex-layout) in your CLI application

Include Angular Flex layout as detailed above.

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
    FlexLayoutModule
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

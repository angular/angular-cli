## Include [Flex Layout](https://github.com/angular/flex-layout) in your CLI application

<a href="https://tburleson-layouts-demos.firebaseapp.com/#/docs" target="_blank">
  <img src="https://user-images.githubusercontent.com/210413/28999595-65e9be78-7a11-11e7-9403-69ecae10fcb4.png"></img>
</a>

> Above is snapshot of a [Online Demos](https://tburleson-layouts-demos.firebaseapp.com/#/docs) using @angular/flex-layout


<br/>

### Include `@angular/flex-layout` as detailed below:

Install the  library and add the dependency to package.json...
```bash
npm install --save @angular/flex-layout
```

Or install the nightly build using:

```bash
npm i --save @angular/flex-layout-builds
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

<br/>

### Sample App

Add the following to `src/app/app.component.css`...
```css
[fxLayout="column"] { border: 1px solid;padding:4px; margin-top:50px; },
[fxFlex]{  padding:5px;},
h3      {  padding-top:20px; },
.header {  background-color: lightyellow;  },
.left   {  background-color: lightblue;  },
.right  {  background-color: pink;  }
```

To verify flex-layout has been set up correctly, change `src/app/app.component.html` to the following...
```html
 <div fxLayout="column">
   <div class="header" fxLayout="row" fxLayoutAlign="space-between center">
       <h3>
         {{title}}
       </h3>
   </div>
   <div fxLayout="row">
       <div class="left" fxFlex="20"> LEFT: 20% wide </div>
       <div class="right" fxFlex> RIGHT: 80% wide </div>
   </div>
 </div>
 ```

After saving this file, return to the browser to see the very ugly but demonstrative flex-layout.

![screen shot 2017-08-05 at 7 20 05 pm](https://user-images.githubusercontent.com/210413/28999629-35c566a0-7a13-11e7-8d36-1d1a2244443c.png)

Among what you should see are - a light yellow header that is the entire width of the window, sitting directly atop 2 columns. Of those 2 columns, the left column should be light blue, and 20% wide, while the right column is pink, 80% to start, and will flex with window (re)size.

<br/>

### More Info 

 - [Installation](https://github.com/angular/flex-layout/wiki/Using-Angular-CLI)
 - [API Overview](https://github.com/angular/flex-layout/wiki/Declarative-API-Overview)
 - [Demo](https://tburleson-layouts-demos.firebaseapp.com/#/docs)

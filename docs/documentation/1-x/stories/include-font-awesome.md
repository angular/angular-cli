<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# Include [Font Awesome](https://fontawesome.com/)

[Font Awesome](https://fontawesome.com/) gives you scalable vector icons that can instantly be customized — size, color, drop shadow, and anything that can be done with the power of CSS.

## Using Angular - FontAwesome
***

Font Awesome now has an [official Angular component](https://fontawesome.com/how-to-use/on-the-web/using-with/angular) that’s available for all who want to easily use our icons in projects.

## How to Install and Use

Create a new project and navigate into the project...
```
ng new my-app
cd my-app
```

Install the Font Awesome SVG Core, some icon content, and the `angular-fontawesome` component:

```bash
$ yarn add @fortawesome/fontawesome-svg-core
$ yarn add @fortawesome/free-solid-svg-icons
$ yarn add @fortawesome/angular-fontawesome
```

First, use `<fa-icon>` in your template:

`src/app/app.component.html`
```html
<div style="text-align:center">
  <!-- simple name only that assumes the 'fas' prefix -->
<fa-icon icon="coffee"></fa-icon>
<!-- ['fas', 'coffee'] is an array that indicates the [prefix, iconName] -->
<fa-icon [icon]="['fas', 'coffee']"></fa-icon>
</div>
```

Then assign the faCoffee member:

`src/app/app.component.ts`
```typescript
import { Component } from '@angular/core';
import { faCoffee } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app';
  faCoffee = faCoffee;
}
```

Lastly, import the component:

`src/app/app.module.ts`

1. Import `{ FontAwesomeModule } from '@fortawesome/angular-fontawesome'`
1. Add `FontAwesomeModule` to `imports`

```typescript
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FontAwesomeModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

### Test

Run `ng serve` to run your application in develop mode, and navigate to `http://localhost:4200`.

To verify Font Awesome has been set up correctly, change `src/app/app.component.html` to the following...
```html
<h1>
  {{title}} <fa-icon [icon]="faCoffee"></fa-icon>
</h1>
```

After saving this file, return to the browser to see the Font Awesome icon next to the app title.


## Using Font-Awesome Library
***
Install the `font-awesome` library and add the dependency to package.json...
```bash
npm install --save-dev @fortawesome/fontawesome-free
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

- [Examples](https://fontawesome.com/how-to-use/on-the-web/setup/getting-started?using=web-fonts-with-css)
- [Angular-FontAwesome github](https://github.com/FortAwesome/angular-fontawesome/blob/master/README.md)

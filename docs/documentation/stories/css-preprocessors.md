# CSS Preprocessor integration

Angular CLI supports all major CSS preprocessors:
- sass/scss ([http://sass-lang.com/](http://sass-lang.com/))
- less ([http://lesscss.org/](http://lesscss.org/))
- stylus ([http://stylus-lang.com/](http://stylus-lang.com/))

To use these preprocessors simply add the file to your component's `styleUrls`:

```javascript
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'app works!';
}
```

When generating a new project you can also define which extension you want for
style files:

```bash
ng new sassy-project --style=sass
```

Or set the default style on an existing project:

```bash
ng set defaults.styleExt scss
```

Style strings added to the `@Component.styles` array _must be written in CSS_ because the CLI cannot apply a pre-processor to inline styles.
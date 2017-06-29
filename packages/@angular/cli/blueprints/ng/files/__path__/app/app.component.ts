import { Component } from '@angular/core';

@Component({
  selector: '<%= prefix %>-root',
  templateUrl: './app.component.pug',
  styleUrls: ['./app.component.<%= styleExt %>']
})
export class AppComponent {
  title = '<%= prefix %>';
}

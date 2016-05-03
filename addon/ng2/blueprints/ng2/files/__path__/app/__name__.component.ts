import { Component } from '@angular/core';

@Component({
  moduleId: module.id,
  selector: '<%= htmlComponentName %>-app',
  templateUrl: '<%= htmlComponentName %>.component.html',
  styleUrls: ['<%= dasherizedModuleName %>.component.<%= styleExt %>']
})
export class <%= jsComponentName %>AppComponent {
  title = '<%= htmlComponentName %> works!';
}

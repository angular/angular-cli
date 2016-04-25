import {Component} from 'angular2/core';

@Component({
  moduleId: __moduleName,
  selector: '<%= htmlComponentName %>-app',
  templateUrl: '<%= htmlComponentName %>.component.html',
  styleUrls: ['<%= dasherizedModuleName %>.component.<%= styleExt %>']
})
export class <%= jsComponentName %>App {
}

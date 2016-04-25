import {Component} from 'angular2/core';
import {RouteConfig, ROUTER_DIRECTIVES, ROUTER_PROVIDERS} from 'angular2/router';

@Component({
  moduleId: __moduleName,
  selector: '<%= htmlComponentName %>-app',
  providers: [ROUTER_PROVIDERS],
  templateUrl: '<%= htmlComponentName %>.component.html',
  styleUrls: ['<%= dasherizedModuleName %>.component.<%= styleExt %>'],
  directives: [ROUTER_DIRECTIVES],
  pipes: []
})
@RouteConfig([
])
export class <%= jsComponentName %>App {
  defaultMeaning: number = 42;

  meaningOfLife(meaning?: number) {
    return `The meaning of life is ${meaning || this.defaultMeaning}`;
  }
}

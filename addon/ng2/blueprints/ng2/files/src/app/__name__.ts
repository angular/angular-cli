import {Component} from 'angular2/core';
import {RouteConfig, ROUTER_DIRECTIVES} from 'angular2/router';
import {CliRouteConfig} from './route-config'

@Component({
  selector: '<%= htmlComponentName %>-app',
  providers: [],
  templateUrl: 'app/<%= htmlComponentName %>.html',
  directives: [ROUTER_DIRECTIVES],
  pipes: []
})
@RouteConfig([

].concat(CliRouteConfig))
export class <%= jsComponentName %>App {
  defaultMeaning: number = 42;

  meaningOfLife(meaning?: number) {
    return `The meaning of life is ${meaning || this.defaultMeaning}`;
  }
}

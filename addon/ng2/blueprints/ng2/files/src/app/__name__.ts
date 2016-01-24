import {Component} from 'angular2/core';
import {
  RouteConfig,
  Route,
  ROUTER_DIRECTIVES
} from 'angular2/router';

import {HelloCmp} from './components/hello/hello';

@Component({
  selector: '<%= htmlComponentName %>-app',
  providers: [],
  templateUrl: 'app/<%= htmlComponentName %>.html',
  directives: [ROUTER_DIRECTIVES],
  pipes: []
})
@RouteConfig([
    new Route({ path: '/', component: HelloCmp, name: 'HelloCmp' }),
])
export class <%= jsComponentName %>App {
  defaultMeaning: number = 42;
  
  meaningOfLife(meaning) {
    return `The meaning of life is ${meaning || this.defaultMeaning}`;
  }
}

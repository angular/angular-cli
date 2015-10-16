import {Component, bootstrap} from 'angular2/angular2';


@Component({
  selector: '<%= htmlComponentName %>-app',
  providers: [],
  templateUrl: 'app/<%= htmlComponentName %>.html',
  directives: [],
  pipes: []
})
export class <%= jsComponentName %>App {

  constructor() {}

}

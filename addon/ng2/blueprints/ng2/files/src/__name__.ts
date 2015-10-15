import {Component, bootstrap} from 'angular2/angular2';


@Component({
  selector: '<%= htmlComponentName %>-app',
  providers: [],
  templateUrl: '<%= htmlComponentName %>.html',
  directives: [],
  pipes: []
})
class <%= jsComponentName %>App {

  constructor() {}

}

bootstrap(<%= jsComponentName %>App);
import {Component} from 'angular2/angular2';


@Component({
  selector: '<%= dasherizedModuleName %>',
  templateUrl: 'app/component/<%= dasherizedModuleName %>/<%= dasherizedModuleName %>.html',
  styleUrls: ['app/component/<%= dasherizedModuleName %>/<%= dasherizedModuleName %>.css'],
  providers: [],
  directives: [],
  pipes: []
})
export class <%= classifiedModuleName %> {

  constructor() {}

}
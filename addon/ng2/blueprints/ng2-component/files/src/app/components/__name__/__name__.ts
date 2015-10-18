import {Component} from 'angular2/angular2';


@Component({
  selector: '<%= dasherizedModuleName %>',
  templateUrl: 'app/components/<%= dasherizedModuleName %>/<%= dasherizedModuleName %>.html',
  styleUrls: ['app/components/<%= dasherizedModuleName %>/<%= dasherizedModuleName %>.css'],
  providers: [],
  directives: [],
  pipes: []
})
export class <%= classifiedModuleName %> {

  constructor() {}

}
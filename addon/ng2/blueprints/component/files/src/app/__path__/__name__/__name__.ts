import {Component} from 'angular2/core';


@Component({
  selector: '<%= dasherizedModuleName %>',
  templateUrl: 'app/<%= dynamicPath %>/<%= dasherizedModuleName %>/<%= dasherizedModuleName %>.html',
  styleUrls: ['app/<%= dynamicPath %>/<%= dasherizedModuleName %>/<%= dasherizedModuleName %>.css'],
  providers: [],
  directives: [],
  pipes: []
})
export class <%= classifiedModuleName %> {

  constructor() {}

}

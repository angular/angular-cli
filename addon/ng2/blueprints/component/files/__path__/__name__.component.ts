import {Component, OnInit} from 'angular2/core';

@Component({
  moduleId: __moduleName,
  selector: '<%= dasherizedModuleName %>',
  templateUrl: '<%= dasherizedModuleName %>.component.html',
  styleUrls: ['<%= dasherizedModuleName %>.component.<%= styleExt %>']
})
export class <%= classifiedModuleName %>Component implements OnInit {

  constructor() {}
  
  ngOnInit() {
  }

}

import {Component, OnInit} from 'angular2/core';
import {<%= classifiedModuleName %>, <%= classifiedModuleName %>Service} from './<%= dasherizedModuleName %>.service';
import {ROUTER_DIRECTIVES} from 'angular2/router';

@Component({
  templateUrl: 'app/<%= dasherizedModuleName %>/<%= dasherizedModuleName %>-list.component.html',
  styleUrls: ['app/<%= dasherizedModuleName %>/<%= dasherizedModuleName %>-list.component.css'],
  directives: [ROUTER_DIRECTIVES]
})
export class <%= classifiedModuleName %>ListComponent implements OnInit {
  <%= camelizedModuleName %>s: <%= classifiedModuleName %>[];
  constructor(
    private _service: <%= classifiedModuleName %>Service) {}
  ngOnInit() {
    this._service.getAll().then(<%= camelizedModuleName %>s => this.<%= camelizedModuleName %>s = <%= camelizedModuleName %>s);
  }
}

import {Component, OnInit} from 'angular2/core';
import {<%= classifiedModuleName %>, <%= classifiedModuleName %>Service} from './<%= dasherizedModuleName %>.service';
import {RouteParams, Router} from 'angular2/router';
import {CanDeactivate, ComponentInstruction} from 'angular2/router';

@Component({
  templateUrl: 'app/<%= dasherizedModuleName %>/<%= dasherizedModuleName %>-detail.component.html',
  styleUrls: ['app/<%= dasherizedModuleName %>/<%= dasherizedModuleName %>-detail.component.css']
})
export class <%= classifiedModuleName %>DetailComponent implements OnInit, CanDeactivate {

  <%= camelizedModuleName %>: <%= classifiedModuleName %>;
  editName: string;

  constructor(
    private _service: <%= classifiedModuleName %>Service,
    private _router: Router,
    private _routeParams: RouteParams
    ) { }

  ngOnInit() {
    let id = +this._routeParams.get('id');
    this._service.get(id).then(<%= camelizedModuleName %> => {
      if (<%= camelizedModuleName %>) {
        this.editName = <%= camelizedModuleName %>.name;
        this.<%= camelizedModuleName %> = <%= camelizedModuleName %>;
      } else {
        this.gotoList();
      }
    });
  }

  routerCanDeactivate(next: ComponentInstruction, prev: ComponentInstruction): any {
    if (!this.<%= camelizedModuleName %> || this.<%= camelizedModuleName %>.name === this.editName) {
      return true;
    }

    return new Promise<boolean>((resolve, reject) => resolve(window.confirm('Discard changes?')));
  }

  cancel() {
    this.editName = this.<%= camelizedModuleName %>.name;
    this.gotoList();
  }

  save() {
    this.<%= camelizedModuleName %>.name = this.editName;
    this.gotoList();
  }

  gotoList() {
    this._router.navigate(['<%= classifiedModuleName %>List']);
  }
}

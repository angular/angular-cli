import { Injectable } from '@angular/core';
import {
  Can<%= hook %>,
  ActivatedRouteSnapShot,
  RouterStateSnapShot,
  Router
} from '@angular/router';

@Injectable()
export class <%= classifiedModuleName %> implements Can<%= hook %> {
  constructor(private router: Router) {}

  can<%= hook %>(<%= route %>: ActivatedRouteSnapShot, state: RouterStateSnapShot) {

  }
}

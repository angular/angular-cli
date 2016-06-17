import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable()
export class <%= classifiedModuleName %>Guard implements CanActivate {
  canActivate(
    next:  ActivatedRouteSnapshot,
    state: RouterStateSnapshot) : Observable<boolean> | boolean {
    return true;
  }
}

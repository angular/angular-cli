import { Injectable } from '@angular/core';
import { <%= implementationImports %>ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class <%= classify(name) %>Guard implements <%= implementations %> {
  <% if (implements && implements.includes('CanActivate')) { %>canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    return true;
  }
  <% } %><% if (implements && implements.includes('CanActivateChild')) { %>canActivateChild(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    return true;
  }
  <% } %><% if (implements && implements.includes('CanLoad')) { %>canLoad(
    route: Route,
    segments: UrlSegment[]): Observable<boolean> | Promise<boolean> | boolean {
    return true;
  }<% } %>
}

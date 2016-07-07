import {Component} from '@angular/core';
import {ROUTER_DIRECTIVES, RouterConfig, Route} from '@angular/router';

@Component({
  selector: 'home',
  template: `
    Home
  `
})
export class Home {
}

@Component({
  selector: 'about',
  template: `
    About
  `
})
export class About {
}




@Component({
  selector: 'app',
  providers: [  ],
  directives: [ ...ROUTER_DIRECTIVES ],
  styles: [`
    .router-link-active {
      background-color: red;
    }
  `],
  template: `
    <nav>
      <a [routerLink]=" ['./'] ">Index</a>
      <a [routerLink]=" ['./home'] ">Home</a>
      <a [routerLink]=" ['./about'] ">About</a>
    </nav>
    <main>
      <router-outlet></router-outlet>
    </main>
  `
})
export class App {
  constructor() {

  }


}


interface NewRoute extends Route {
  pathMatch?: 'full'|'prefix';
}

export const routes: RouterConfig = [
  (<NewRoute>{ path: '', component: Home,
    // new api
    pathMatch: 'full',
    // old api
    terminal: true
  }),
  { path: 'home', component: Home },
  { path: 'about', component: About }
];

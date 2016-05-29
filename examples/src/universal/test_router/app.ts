import {Component} from '@angular/core';
import {ROUTER_DIRECTIVES, RouteConfig} from '@angular/router-deprecated';

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
      <a [routerLink]=" ['./Index'] ">Index</a>
      <a [routerLink]=" ['./Home'] ">Home</a>
      <a [routerLink]=" ['./About'] ">About</a>
    </nav>
    <main>
      <router-outlet></router-outlet>
    </main>
  `
})
@RouteConfig([
  { path: '/', component: Home, name: 'Index' },
  { path: '/home', component: Home, name: 'Home' },
  { path: '/about', component: About, name: 'About' }
])
export class App {
  constructor() {

  }


}

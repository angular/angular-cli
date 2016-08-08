import { Component } from '@angular/core';
import { ROUTER_DIRECTIVES } from '@angular/router';

@Component({
  selector: 'github',
  pipes: [],
  providers: [],
  directives: [ ROUTER_DIRECTIVES ],
  template: `
<h3>
  Angular 2 Seed
</h3>
<nav>
  <a [routerLink]="['/']">
    Home
  </a>
  |
  <a [routerLink]="['/about']">
    About
  </a>
  |
  <a [routerLink]="['/github', 'angular']">
    Github Repos
  </a>
</nav>

<main>
  <router-outlet></router-outlet>
</main>


<footer>
  © 2016
</footer>
  `,
})
export class Github {
  constructor() {}

}

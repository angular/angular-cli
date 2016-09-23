import { Component } from '@angular/core';

@Component({
  selector: 'github',
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

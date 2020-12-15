import { Component } from '@angular/core';

@Component({
  selector: 'app-homepage',
  template: `
    <p>
      Welcome to {{ title }}!
    </p>
  `,
  styles: []
})
export class HomepageComponent {
  title = 'Pokemon'
  constructor() {}
}

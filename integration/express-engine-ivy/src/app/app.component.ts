import { Component, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-root',
  template: `
    <div>Hello {{ title }}!</div>
    <span class="href-check">{{ href }}</span>
  `,
  styles: [
    `
      div {
        font-weight: bold;
      }
    `,
  ],
})
export class AppComponent {
  title = 'world';
  href: string;

  constructor(@Inject(DOCUMENT) doc: Document) {
    this.href = doc.location.href;
  }
}

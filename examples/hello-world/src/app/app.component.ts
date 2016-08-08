import { Component } from '@angular/core';
import {APP_PROVIDERS as GITHUB_APP_PROVIDERS, Github} from './github';

@Component({
  selector: 'wat',
  directives: [
    Github
  ],
  template: `
    <div>
      Hello World
    </div>
    <github></github>
  `
})
export class Wat {
  constructor () {

  }
}

@Component({
  selector: 'app',
  directives: [Wat],
  styles: [`
  div {
    background-color: red;
  }
  `],
  template: `
    <div>
      <input id="myInput">
      Hello World
      {{ wat }}
      <wat>
      </wat>
    </div>
  `
})
export class App {
  wat = '';
  constructor () {

  }
  ngOnInit() {
    setTimeout(() => {
      this.wat = 'yolo' + Math.random();
    })
  }

}

export const APP_PROVIDERS = [
  ...GITHUB_APP_PROVIDERS
];

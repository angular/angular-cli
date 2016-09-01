import { Component } from '@angular/core';
import {APP_PROVIDERS as GITHUB_APP_PROVIDERS, Github} from './github';

@Component({
  selector: 'wat',
  styles: [`
  div {
    background-color: green;
  }
  `],
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
      <div *ngIf="toggle">
        <wat></wat>
      </div>
      <button (click)="onWat($event)">Wat</button>
    </div>
  `
})
export class App {
  wat = '';
  toggle = false;
  constructor () {

  }
  onWat() {
    this.toggle = !this.toggle;
  }
  ngOnInit() {
    setTimeout(() => {
      this.wat = 'yolo' + Math.random();
    });
  }

}

export const APP_PROVIDERS = [
  ...GITHUB_APP_PROVIDERS
];

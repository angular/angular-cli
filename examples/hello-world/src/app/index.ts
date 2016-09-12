import { Component, OnInit } from '@angular/core';
import { Http, Jsonp } from '@angular/http';

@Component({
  selector: 'wat',
  styles: [`
    div {
      background-color: red;
    }
  `],
  template: `
    <div>
      Hello World
    </div>
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
      background-color: green;
    }
  `],
  template: `
    <div>hello world!!!</div>
    <pre>{{ response | json }}</pre>
    <div>
      <input id="myInput" [(ngModel)]="wat">
      Hello World
      {{ wat }}
      <div *ngIf="toggle">
        <wat></wat>
      </div>
      <button (click)="onWat($event)">Wat</button>
    </div>
  `
})
export class App implements OnInit {
  wat = 'yolo';
  response = {};
  toggle = false;
  onWat() {
    this.toggle = !this.toggle;
  }
  constructor(public jsonp: Jsonp) {
  }

  ngOnInit() {
    // this.jsonp.request('https://api.github.com?callback=JSONP_CALLBACK')
    //   .subscribe((res) => {
    //     var json = res.json();
    //     this.response = json;
    //   });
  }
}


// export function main() {
//   return platformBrowserDynamic().bootstrapModule(MainModule);
// }

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
      <div id="myid-1">
        <div id="myid-2">
          <div id="myid-3">
            <input oh-hai [value]="'lololwit'">
          <div>
        <div>
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
export class App  {
  wat = 'yolo';
  response = {};
  toggle = false;
  onWat() {
    this.toggle = !this.toggle;
  }
  constructor(public http: Http) {
  }

  ngAfterViewInit() {
    // // var el = document.querySelector('app');
    // console.time('create Zone');

    // console.time('create Zone yo' + 0);
    // var el: any = document;
    // console.timeEnd('create Zone yo' + 0);

    // console.time('create Zone yo' + 1);
    // el = el.querySelector('app');
    // console.timeEnd('create Zone yo' + 1);

    // console.time('create Zone yo' + 2);
    // el = el.querySelector('#myid-1');
    // console.timeEnd('create Zone yo' + 2);

    // console.time('create Zone yo' + 3);
    // el = el.querySelector('#myid-2');
    // console.timeEnd('create Zone yo' + 3);

    // console.time('create Zone yo' + 4);
    // el = el.querySelector('#myid-3');
    // console.timeEnd('create Zone yo' + 4);

    // console.time('create Zone yo' + 5);
    // el = el.querySelector('input');
    // console.timeEnd('create Zone yo' + 5);

    // console.log('querySelector =>', el.tagName, el.value);
    // console.timeEnd('create Zone');
    // this.http.request('/data.json')
    //   .subscribe((res) => {
    //     var json = res.json();
    //     this.response = json;
    //   });
  }
}


// export function main() {
//   return platformBrowserDynamic().bootstrapModule(MainModule);
// }

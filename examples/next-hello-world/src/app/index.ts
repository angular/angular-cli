import { Component, OnInit } from '@angular/core';
import { Http, Jsonp } from '@angular/http';
// import 'rxjs/Rx';


@Component({
  selector: 'app',
  styles: [`
    div {
      background-color: red;
    }
  `],
  template: `
  <div>hello world!!!</div>
  <pre>{{ response | json }}</pre>
  `
})
export class App implements OnInit {
  response = {};
  constructor() {
  // constructor(public jsonp: Jsonp) {

  }

  ngOnInit() {
   // this.jsonp.request('https://api.github.com?callback=JSON_CALLBACK')
   //    .subscribe((res) => {
   //      var json = res.json();
   //      this.response = json;
   //      // console.log('doneeeee')
   //    });
  }

}


// export function main() {
//   return platformBrowserDynamic().bootstrapModule(MainModule);
// }

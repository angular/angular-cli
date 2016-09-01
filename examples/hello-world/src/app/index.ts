import { Component, OnInit } from '@angular/core';
import { Http, Jsonp } from '@angular/http';
// import 'rxjs/Rx';

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
  `
})
export class App implements OnInit {

  response = {};

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

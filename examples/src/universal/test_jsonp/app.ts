import {Component} from '@angular/core';
import {Jsonp} from '@angular/http';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/delay';

@Component({
  selector: 'app',
  providers: [],
  directives: [],
  styles: [`
  `],
  template: `

  <pre>{{ response | json }}</pre>

  `
})
export class App {
  response = {};

  constructor(private jsonp: Jsonp) {

  }

  ngOnInit() {
    this.jsonp.request('https://api.github.com?callback=JSON_CALLBACK')
    .subscribe(res => {
      var json = res.json();
      this.response = json;
    });
  }


}

import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-homepage',
  template: ` <p>Welcome to {{ title }}!</p>
    <p>{{ message$ | async }}</p>`,
  styles: [],
})
export class HomepageComponent {
  title = 'Pokemon';

  message$: Observable<string>;
  constructor(http: HttpClient) {
    this.message$ = http
      .get<{ message: string }>('assets/data.json')
      .pipe(map((data) => data.message));
  }
}

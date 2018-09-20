import {Component, ViewEncapsulation} from '@angular/core';
import {MyInjectable} from './injectable';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent {
  constructor(public inj: MyInjectable) {
    console.log(inj);
  }
}

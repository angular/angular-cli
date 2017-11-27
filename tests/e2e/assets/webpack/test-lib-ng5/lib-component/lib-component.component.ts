import { Component } from '@angular/core';
import { LibServiceService } from '../lib-service.service';


@Component({
  selector: 'lib-component',
  templateUrl: './lib-component.component.html',
  styleUrls: [
    './lib-component.component.scss'
  ]
})
export class LibComponentComponent {
  constructor(public libService: LibServiceService) { }
}

import { Directive } from '@angular/core';

@Directive({
  selector: '[<%= selector %>]'
})
export class <%= classify(name) %>Directive {

  constructor() { }

}

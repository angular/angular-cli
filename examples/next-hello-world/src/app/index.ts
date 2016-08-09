import { Component } from '@angular/core';



@Component({
  selector: 'app',
  styles: [`
    div {
      background-color: red;
    }
  `],
  template: `
  <div>hello world!!!</div>
  `
})
export class App {

}


// export function main() {
//   return platformBrowserDynamic().bootstrapModule(MainModule);
// }

import { NgModule, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UniversalModule } from 'angular2-universal/node';

@Component({
  selector: 'app',
  template: 'Hello Universal App'
})
class App {

}

@NgModule({
  bootstrap: [ App ],
  declarations: [ App ],
  imports: [
    UniversalModule,
    FormsModule
  ]
})
export class MainModule {}

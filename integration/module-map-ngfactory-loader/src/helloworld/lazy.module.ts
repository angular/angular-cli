import {NgModule, Component} from '@angular/core';
import {RouterModule} from '@angular/router';

@Component({
  selector: 'app-lazy-view',
  template: `<h3>im lazy</h3>`,
  styles: [`
    h3 {
      font-weight: bold;
    }
  `]
})
export class LazyComponent {
}

@NgModule({
  declarations: [LazyComponent],
  imports: [
    RouterModule.forChild([
      { path: '', component: LazyComponent, pathMatch: 'full'}
    ])
  ]
})
export class LazyModule {
}

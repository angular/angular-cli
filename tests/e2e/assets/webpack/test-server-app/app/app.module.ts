import { NgModule, Component } from '@angular/core';
import { ServerModule  } from '@angular/platform-server';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';

@Component({
  selector: 'home-view',
  template: 'home!'
})
export class HomeView {}


@NgModule({
  declarations: [
    AppComponent,
    HomeView
  ],
  imports: [
    ServerModule,
    RouterModule.forRoot([
      {path: 'lazy', loadChildren: './lazy.module#LazyModule'},
      {path: '', component: HomeView}
    ])
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  static testProp: string;
}

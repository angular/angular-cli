import { NgModule, Component } from '@angular/core';
import { ServerModule  } from '@angular/platform-server';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { MyInjectable } from './injectable';

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
    BrowserModule.withServerTransition({
      appId: 'app'
    }),
    ServerModule,
    RouterModule.forRoot([
      {path: 'lazy', loadChildren: './lazy.module#LazyModule'},
      {path: '', component: HomeView}
    ])
  ],
  providers: [MyInjectable],
  bootstrap: [AppComponent]
})
export class AppModule {
  static testProp: string;
}

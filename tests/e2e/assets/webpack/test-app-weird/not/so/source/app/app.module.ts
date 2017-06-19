import { NgModule, Component } from '@angular/core';
import { BrowserModule  } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';

@Component({
  selector: 'home-view',
  template: 'home!'
})
export class HomeView {}


// @ifdef DEBUG
console.log("DEBUG_ONLY");
// @endif

// @ifndef DEBUG
console.log("PRODUCTION_ONLY");
// @endif


@NgModule({
  declarations: [
    AppComponent,
    HomeView
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot([
      {path: 'lazy', loadChildren: './lazy.module#LazyModule'},
      {path: '', component: HomeView}
    ])
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

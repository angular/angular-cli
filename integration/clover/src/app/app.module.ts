import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RendererModule, TransferHttpCacheModule } from '@nguniversal/common/clover';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule.withServerTransition({ appId: 'hlw' }),
    RendererModule.forRoot(),
    TransferHttpCacheModule,
    AppRoutingModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}

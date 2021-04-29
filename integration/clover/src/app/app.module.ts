import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RendererModule, TransferHttpCacheModule } from '@nguniversal/common/clover';
import { HttpClientInMemoryWebApiModule } from 'angular-in-memory-web-api';
import { PokemonService } from './pokemon.service';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomepageComponent } from './homepage.component';
import { PokedexComponent } from './pokedex.component';

@NgModule({
  declarations: [AppComponent, PokedexComponent, HomepageComponent],
  imports: [
    BrowserModule.withServerTransition({ appId: 'serverApp' }),
    AppRoutingModule,
    HttpClientModule,

    // The HttpClientInMemoryWebApiModule module intercepts HTTP requests
    // and returns simulated server responses.

    HttpClientInMemoryWebApiModule.forRoot(PokemonService, { dataEncapsulation: false }),

    RendererModule.forRoot(),
    TransferHttpCacheModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}

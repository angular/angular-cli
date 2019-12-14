import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pokedex',
  template: `
  <div *ngIf="pokemonObservable | async as pokemon">
    <h1>{{ pokemon.name }}</h1>
    <img src="{{ pokemon.img }}">
  </div>
  `,
  styleUrls: []
})
export class PokedexComponent {
  pokemonObservable: Observable<any>;
  constructor(private http: HttpClient, private router: Router) {
    // This request will use the In-memory Db in PokemonService.
    this.pokemonObservable = http.get<any>('api' + router.url);
  }
}

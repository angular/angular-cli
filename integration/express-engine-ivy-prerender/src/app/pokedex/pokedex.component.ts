import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pokedex',
  templateUrl: './pokedex.component.html',
  styleUrls: ['./pokedex.component.css']
})
export class PokedexComponent {
  pokemonObservable: Observable<any>;
  constructor(private http: HttpClient, private router: Router) {
    // This request will use the In-memory Db in PokemonService.
    this.pokemonObservable = http.get<any>('api' + router.url);
  }
}

import { Component } from '@angular/core';

@Component({
    selector: 'app',
    template : `

        <h1 class="title">Angular Universal Heros Playground</h1>
        
        <nav>
        <a routerLink="/crisis-center" routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }">Crisis Center</a>
        <a routerLink="/heroes" routerLinkActive="active">Heroes</a>
        <a routerLink="/crisis-center/admin" routerLinkActive="active">Crisis Admin</a>
        <a routerLink="/login" routerLinkActive="active">Login</a>
        </nav>
        <router-outlet></router-outlet>
    
    `
})
export class AppComponent { }

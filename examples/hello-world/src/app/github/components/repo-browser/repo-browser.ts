import { Component } from '@angular/core';
import { Router, ROUTER_DIRECTIVES } from '@angular/router';
import { GithubService } from '../../services';

@Component({
  selector: 'repo-browser',
  pipes: [],
  providers: [ GithubService ],
  directives: [ ROUTER_DIRECTIVES ],
  templateUrl: './repo-browser.html',
  styleUrls: ['./repo-browser.css']
})
export class RepoBrowser {

  constructor(private router: Router, private github: GithubService) {}

  searchForOrg(orgName: string) {
    this.github.getOrg(orgName)
      .subscribe(({name}) => {
        console.log(name);
        this.router.navigate(['/github', orgName]);
      });
  }

}

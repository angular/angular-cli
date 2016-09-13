import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { GithubService } from '../../services';

@Component({
  selector: 'repo-browser',
  providers: [ GithubService ],
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

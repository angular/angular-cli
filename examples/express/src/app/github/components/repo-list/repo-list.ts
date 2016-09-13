import {Component} from '@angular/core';
import {GithubService} from '../../services';
import {Observable} from 'rxjs/Observable';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'repo-list',
  styleUrls: ['./repo-list.css'],
  templateUrl: './repo-list.html',
})
export class RepoList {
  org: string;
  repos: Observable<any>;

  constructor(public github: GithubService, private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.org = params['org'];
      if (this.org) {
        this.repos = this.github.getReposForOrg(this.org);
      }
    });
  }
}

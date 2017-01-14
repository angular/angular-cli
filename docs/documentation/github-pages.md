### Deploying the app via GitHub Pages

You can deploy your apps quickly via:

```bash
ng github-pages:deploy --message "Optional commit message"
```

This will do the following:

- creates GitHub repo for the current project if one doesn't exist
- rebuilds the app in production mode at the current `HEAD`
- creates a local `gh-pages` branch if one doesn't exist
- moves your app to the `gh-pages` branch and creates a commit
- edit the base tag in index.html to support github pages
- pushes the `gh-pages` branch to github
- returns back to the original `HEAD`

Creating the repo requires a token from github, and the remaining functionality
relies on ssh authentication for all git operations that communicate with github.com.
To simplify the authentication, be sure to [setup your ssh keys](https://help.github.com/articles/generating-ssh-keys/).

If you are deploying a [user or organization page](https://help.github.com/articles/user-organization-and-project-pages/), you can instead use the following command:

```bash
ng github-pages:deploy --user-page --message "Optional commit message"
```

This command pushes the app to the `master` branch on the github repo instead
of pushing to `gh-pages`, since user and organization pages require this.


## Options:

`--message` The commit message to include with the build, must be wrapped in quotes.
  - Default: `new gh-pages version`

`--target` Whether to push the target build or the production build.
  - Default: `production`

`--environment` 
  - Default: `''`

`--user-page` Deploy as a user/org page.
  - Default: `false`

`--skip-build` Skip building the project before deploying
  - Default: `false`

`--gh-token` Github token
  - Default: `''`

`--gh-username` Github username
  - Default `''`

`--base-href` The content for the base tag to place in `index.html`. 
  - Default `null`
    1. If provided, will use value
    
    2. If `--user-page` is `true`, will leave `index.html` unchanged
    
    3. Otherwise auto replace with git project name (`/my-project/` for git://github.com/myUser/my-project.git)
    
`--custom-domain` Set a custom domain for the deployment.
  - Default `null`
  - Example `--custom-domain='bestproject.com'`
  
     This requires `--base-href='/'` to also be set.  For setting up DNS, please see the [GitHub help topic](https://help.github.com/articles/using-a-custom-domain-with-github-pages/)

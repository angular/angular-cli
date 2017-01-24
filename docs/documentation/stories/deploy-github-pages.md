# Deploying the app via GitHub Pages

You can deploy your apps quickly via:

```bash
ng github-pages:deploy --message "Optional commit message"
```

This will do the following:

- creates GitHub repo for the current project if one doesn't exist
- rebuilds the app in production mode at the current `HEAD`
- creates a local `gh-pages` branch if one doesn't exist
- moves your app to the `gh-pages` branch and creates a commit
- edit the base tag in index.html to support GitHub Pages
- pushes the `gh-pages` branch to GitHub
- returns back to the original `HEAD`

Creating the repo requires a token from GitHub, and the remaining functionality
relies on ssh authentication for all git operations that communicate with github.com.
To simplify the authentication, be sure to [setup your ssh keys](https://help.github.com/articles/generating-ssh-keys/).

If you are deploying a [user or organization page](https://help.github.com/articles/user-organization-and-project-pages/), you can instead use the following command:

```bash
ng github-pages:deploy --user-page --message "Optional commit message"
```

This command pushes the app to the `master` branch on the GitHub repo instead
of pushing to `gh-pages`, since user and organization pages require this.

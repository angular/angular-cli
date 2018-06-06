# Deploy to GitHub Pages

A simple way to deploy your Angular app is to use
[GitHub Pages](https://help.github.com/articles/what-is-github-pages/).

The first step is to [create a GitHub account](https://github.com/join), and then
[create a repository](https://help.github.com/articles/create-a-repo/) for your project.
Make a note of the user name and project name in GitHub.

Then all you need to do is run `ng build --prod --output-path docs --base-href PROJECT_NAME`, where
`PROJECT_NAME` is the name of your project in GitHub.
Make a copy of `docs/index.html` and name it `docs/404.html`.

Commit your changes and push. On the GitHub project page, configure it to
[publish from the docs folder](https://help.github.com/articles/configuring-a-publishing-source-for-github-pages/#publishing-your-github-pages-site-from-a-docs-folder-on-your-master-branch).

And that's all you need to do! Now you can see your page at
`https://USER_NAME.github.io/PROJECT_NAME/`.

You can also use [angular-cli-ghpages](https://github.com/angular-buch/angular-cli-ghpages), a full
featured package that does this all this for you and has extra functionality.

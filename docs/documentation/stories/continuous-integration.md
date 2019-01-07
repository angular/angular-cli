**Documentation below is for CLI version 6 and we no longer accept PRs to improve this. For version 7 see [here](https://angular.io/guide/testing#set-up-continuous-integration)**.

# Continuous Integration

One of the best ways to keep your project bug free is through a test suite, but it's easy to forget
to run tests all the time.

That's where Continuous Integration (CI) servers come in.
You can set up your project repository so that your tests run on every commit and pull request.

There are paid CI services like [Circle CI](https://circleci.com/) and
[Travis CI](https://travis-ci.com/), and you can also host your own for free using
[Jenkins](https://jenkins.io/) and others.

Even though Circle CI and Travis CI are paid services, they are provided free for open source
projects.
You can create a public project on GitHub and add these services without paying.

We're going to see how to update your test configuration to run in CI environments, and how to
set up Circle CI and Travis CI.


## Update test configuration

Even though `ng test` and `ng e2e` already run on your environment, they need to be adjusted to
run in CI environments.

We'll use [Headless Chrome](https://developers.google.com/web/updates/2017/04/headless-chrome#cli) in CI environments. In some environments we need to start the browser without
sandboxing or disable the gpu. Here we'll do both. 

In `karma.conf.js`, add a custom launcher called `ChromeHeadlessCI` below `browsers`:

```
browsers: ['Chrome'],
customLaunchers: {
  ChromeHeadlessCI: {
    base: 'ChromeHeadless',
    flags: ['--no-sandbox', '--disable-gpu']
  }
},
```

We'll override the `browsers` option from the command line to use our new configuration.

Create a new file in the `e2e` directory of your project called `protractor-ci.conf.js`, that extends
the original `protractor.conf.js`:

```
const config = require('./protractor.conf').config;

config.capabilities = {
  browserName: 'chrome',
  chromeOptions: {
    args: ['--headless', '--no-sandbox', '--disable-gpu']
  }
};

exports.config = config;
```

Now you can run the following commands to use the new configurations:

```
ng test --watch=false --progress=false --browsers=ChromeHeadlessCI
ng e2e --protractor-config=./e2e/protractor-ci.conf.js
```

For CI environments it's also a good idea to disable progress reporting (via `--progress=false`)
to avoid spamming the server log with progress messages. We've added that option to `ng test`. An equivalent
option has been requested for
`ng e2e` [(#11412)](https://github.com/angular/angular-cli/issues/11412). 


## Using Circle CI

Create a folder called `.circleci` at the project root, and inside of it create a file called
`config.yml`:

```yaml
version: 2
jobs:
  build:
    working_directory: ~/my-project
    docker:
      # specify the version you desire here
      # see https://hub.docker.com/r/circleci/node/tags/
      - image: circleci/node:8-browsers
    steps:
      - checkout
      - restore_cache:
          key: my-project-{{ .Branch }}-{{ checksum "package-lock.json" }}
      - run: npm install
      - save_cache:
          key: my-project-{{ .Branch }}-{{ checksum "package-lock.json" }}
          paths:
             - "node_modules"
      - run: npm run test -- --watch=false --progress=false --browsers=ChromeHeadlessCI
      - run: npm run e2e -- --protractor-config=./e2e/protractor-ci.conf.js
```

We're doing a few things here:
  -
  - `node_modules` is cached.
  - we use [npm run](https://docs.npmjs.com/cli/run-script) to run `ng` because `@angular/cli` is
  not installed globally. The double dash (`--`) is needed to pass arguments into the npm script.

Commit your changes and push them to your repository.

Next you'll need to [sign up for Circle CI](https://circleci.com/docs/2.0/first-steps/) and
[add your project](https://circleci.com/add-projects).
Your project should start building.

Be sure to check out the [Circle CI docs](https://circleci.com/docs/2.0/) if you want to know more.


## Using Travis CI

Create a file called `.travis.yml` at the project root:

```yaml
dist: trusty
sudo: false

language: node_js
node_js:
  - "8"

addons:
  apt:
    sources:
      - google-chrome
    packages:
      - google-chrome-stable

cache:
  directories:
     - ./node_modules

install:
  - npm install

script:
  - npm run test -- --watch=false --progress=false --browsers=ChromeHeadlessCI
  - npm run e2e -- --protractor-config=./e2e/protractor-ci.conf.js
```

Commit your changes and push them to your repository.

Next you'll need to [sign up for Travis CI](https://travis-ci.org/auth) and
[add your project](https://travis-ci.org/profile).
You'll need to push a new commit to trigger a build.

Be sure to check out the [Travis CI docs](https://docs.travis-ci.com/) if you want to know more.

## ChromeDriver

In CI environments it's a good idea to to use a specific version of [ChromeDriver](http://chromedriver.chromium.org/)
instead of allowing `ng e2e` to use the latest one. CI environments often use older versions of chrome, which are unsupported by newer versions of ChromeDriver.

An easy way to do this is to define a NPM script:

```text
"webdriver-update-ci": "webdriver-manager update --standalone false --gecko false --versions.chrome 2.37"
```

And then on CI environments you call that script followed by the e2e command without updating webdriver:

```text
npm run webdriver-update-ci
ng e2e --webdriver-update=false
```

This way you will always use a specific version of chrome driver between runs.
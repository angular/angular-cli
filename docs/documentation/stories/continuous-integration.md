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

When using Chrome in CI environments it has to be started without sandboxing.
We can achieve that by editing our test configs.

In `karma.conf.js`, add a custom launcher called `ChromeNoSandbox` below `browsers`:

```
browsers: ['Chrome'],
customLaunchers: {
  ChromeNoSandbox: {
    base: 'Chrome',
    flags: ['--no-sandbox']
  }
},
```

Create a new file in the root of your project called `protractor-ci.conf.js`, that extends
the original `protractor.conf.js`:

```
const config = require('./protractor.conf').config;

config.capabilities = {
  browserName: 'chrome',
  chromeOptions: {
    args: ['--no-sandbox']
  }
};

exports.config = config;
```

Now you can run the following commands to use the `--no-sandbox` flag:

```
ng test --single-run --no-progress --browser=ChromeNoSandbox
ng e2e --no-progress --config=protractor-ci.conf.js
```

For CI environments it's also a good idea to disable progress reporting (via `--no-progress`)
to avoid spamming the server log with progress messages.


## Using Circle CI

Create a folder called `.circleci` at the project root, and inside of it create a file called
`config.yml`:

```yaml
version: 2
jobs:
  build:
    working_directory: ~/my-project
    docker:
      - image: circleci/node:6-browsers
    steps:
      - checkout
      - restore_cache:
          key: my-project-{{ .Branch }}-{{ checksum "package.json" }}
      - run: npm install
      - save_cache:
          key: my-project-{{ .Branch }}-{{ checksum "package.json" }}
          paths:
            - "node_modules"
      - run: xvfb-run -a npm run test -- --single-run --no-progress --browser=ChromeNoSandbox
      - run: xvfb-run -a npm run e2e -- --no-progress --config=protractor-ci.conf.js

```

We're doing a few things here:
  -
  - `node_modules` is cached.
  - [npm run](https://docs.npmjs.com/cli/run-script) is used to run `ng` because `@angular/cli` is
  not installed globally. The double dash (`--`) is needed to pass arguments into the npm script.
  - `xvfb-run` is used to run `npm run` to run a command using a virtual screen, which is needed by
  Chrome.

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
  - "6"

cache:
  directories:
     - ./node_modules

install:
  - npm install

script:
  # Use Chromium instead of Chrome.
  - export CHROME_BIN=chromium-browser
  - xvfb-run -a npm run test -- --single-run --no-progress --browser=ChromeNoSandbox
  - xvfb-run -a npm run e2e -- --no-progress --config=protractor-ci.conf.js

```

Although the syntax is different, we're mostly doing the same steps as were done in the
Circle CI config.
The only difference is that Travis doesn't come with Chrome, so we use Chromium instead.

Commit your changes and push them to your repository.

Next you'll need to [sign up for Travis CI](https://travis-ci.org/auth) and
[add your project](https://travis-ci.org/profile).
You'll need to push a new commit to trigger a build.

Be sure to check out the [Travis CI docs](https://docs.travis-ci.com/) if you want to know more.

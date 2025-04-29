# Building and Testing Angular CLI

## Installation

To get started locally, follow these instructions:

1. If you haven't done it already, [make a fork of this repo](https://github.com/angular/angular-cli/fork).
2. If you are on Windows, see [the extra steps needed for contributing on Windows](#windows)
3. Clone to your local computer using `git`.
4. Make sure that you have Node `v20.18.1` or higher installed. See instructions [here](https://nodejs.org/en/download/).
5. Install `pnpm`.
   - You can install pnpm by running `npm i -g pnpm@9`.
   - See detailed instructions [here](https://pnpm.io/installation).
6. Run `pnpm install` from the root of your clone of this project to install dependencies.

## Building and Installing the CLI

To make a local build:

```shell
pnpm build --local
```

This generates a number of tarballs in the `dist/` directory. To actually use
the locally built tools, switch to another repository reproducing the specific
issue you want to fix (or just generate a local repo with `ng new`). Then
install the locally built packages:

```shell
cd "${EXAMPLE_ANGULAR_PROJECT_REPO}"
npm install -D ${CLI_REPO}/dist/*.tgz
```

Builds of this example project will use tooling created from the previous local
build and include any local changes. When using the CLI, it will automatically
check for a local install and use that if present. This means you can just run:

```shell
npm install -g @angular/cli
```

to get a global install of the latest CLI release. Then running any `ng` command
in the example project will automatically find and use the local build of the
CLI.

Note: If you are testing `ng update`, be aware that installing all the tarballs
will also update the framework (`@angular/core`) to the latest version. In this
case, simply install the CLI alone with
`npm install -D ${CLI_REPO}/dist/_angular_cli.tgz`, that way the rest of the
project remains to be upgraded with `ng update`.

## Debugging

To debug an invocation of the CLI, [build and install the CLI for an example
project](#building-and-installing-the-cli), then run the desired `ng` command
as:

```shell
node --inspect-brk node_modules/.bin/ng ...
```

This will trigger a breakpoint as the CLI starts up. You can connect to this
using the supported mechanisms for your IDE, but the simplest option is to open
Chrome to [chrome://inspect](chrome://inspect) and then click on the `inspect`
link for the `node_modules/.bin/ng` Node target.

Unfortunately, the CLI dynamically `require()`'s other files mid-execution, so
the debugger is not aware of all the source code files before hand. As a result,
it is tough to put breakpoints on files before the CLI loads them. The easiest
workaround is to use the `debugger;` statement to stop execution in the file you
are interested in, and then you should be able to step around and set breakpoints
as expected.

## Testing

There are two different test suites which can be run locally:

### Unit tests

- Run all tests: `pnpm bazel test //packages/...`
- Run a subset of the tests, use the full Bazel target example: `pnpm bazel test //packages/schematics/angular:angular_test`
- For a complete list of test targets use the following Bazel query: `pnpm bazel query "tests(//packages/...)"`

When debugging a specific test, change `describe()` or `it()` to `fdescribe()`
and `fit()` to focus execution to just that one test. This will keep the output clean and speed up execution by not running irrelevant tests.

You can find more info about debugging [tests with Bazel in the docs.](https://github.com/angular/angular-cli/blob/main/docs/process/bazel.md#debugging-jasmine_node_test)

### End to end tests

- For a complete list of test targets use the following Bazel query: `pnpm bazel query "tests(//tests/...)"`
- Run a subset of the tests: `pnpm bazel test //tests/legacy-cli:e2e_node22 --config=e2e --test_filter="tests/i18n/ivy-localize-*"`
- Use `bazel run` to debug failing tests debugging: `pnpm bazel run //tests/legacy-cli:e2e_node22 --config=e2e --test_arg="--glob=tests/basic/aot.ts"`
- Provide additional `e2e_runner` options using `--test_arg`: `--test_arg="--package-manager=yarn"`

When running the debug commands, Node will stop and wait for a debugger to attach.
You can attach your IDE to the debugger to stop on breakpoints and step through the code. Also, see [IDE Specific Usage](#ide-specific-usage) for a
simpler debug story.

## IDE Specific Usage

Some additional tips for developing in specific IDEs.

### Intellij IDEA / WebStorm

To load the project in Intellij products, simply `Open` the repository folder.
Do **not** `Import Project`, because that will overwrite the existing
configuration.

Once opened, the editor should automatically detect run configurations in the
workspace. Use the drop down to choose which one to run and then click the `Run`
button to start it. When executing a debug target, make sure to click the
`Debug` icon to automatically attach the debugger (if you click `Run`, Node will
wait forever for a debugger to attach).

![Intellij IDEA run configurations](images/run-configurations.png)

### VS Code

In order to debug some Angular CLI behaviour using Visual Studio Code, you can run `npm run build`, and then use a launch configuration like the following:

```json
{
  "type": "node",
  "request": "launch",
  "name": "ng serve",
  "cwd": "<path to an Angular project generated with Angular-CLI>",
  "program": "${workspaceFolder}/dist/@angular/cli/bin/ng",
  "args": [
    "<ng command>",
    ...other arguments
  ],
  "console": "integratedTerminal"
}
```

Then you can add breakpoints in `dist/@angular` files.

For more information about Node.js debugging in VS Code, see the related [VS Code Documentation](https://code.visualstudio.com/docs/nodejs/nodejs-debugging).

## CPU Profiling

In order to investigate performance issues, CPU profiling is often useful.

### Creating a profile

Node.js 16+ users can use the Node.js command line argument `--cpu-prof` to create a CPU profile.

```bash
node --cpu-prof node_modules/.bin/ng build
```

In addition to this one, another, more elaborated way to capture a CPU profile using the Chrome Devtools is detailed in https://github.com/angular/angular-cli/issues/8259#issue-269908550.

#### Opening a profile

You can use the Chrome Devtools to process it. To do so:

1. open `chrome://inspect` in Chrome
1. click on "Open dedicated DevTools for Node"
1. go to the "profiler" tab
1. click on the "Load" button and select the generated `.cpuprofile` file
1. on the left panel, select the associated file

## Creating New Packages

Adding a package to this repository means running two separate commands:

1. `schematics devkit:package PACKAGE_NAME`. This will update the `.monorepo` file, and create the
   base files for the new package (package.json, src/index, etc).
1. `devkit-admin templates`. This will update the README and all other template files that might
   have changed when adding a new package.

For private packages, you will need to add a `"private": true` key to your package.json manually.
This will require re-running the template admin script.

## Windows

To contribute to Angular using a Windows machine, you need to use the [Windows Linux Subsystem](https://learn.microsoft.com/en-us/windows/wsl/about) (also known as WSL).
Installing WSL on your machine requires a few extra steps, but we believe it's generally useful for developing on Windows:

1.  Run `wsl --install` from Powershell (as administrator).
2.  Restart your machine.
3.  Enter the WSL environment by running: `wsl`.
4.  Continue with the developer guide as if you were on a native Linux system.

For a more detailed guide, refer to the official Microsoft documentation: [Installing WSL](https://learn.microsoft.com/en-us/windows/wsl/install).

**Note:** Angular continues to support native Windows development via the `ng` CLI and rigorously tests on Windows for every code change. This recommendation specifically applies to contributing to the Angular codebase itself.

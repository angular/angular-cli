* Added check for `env.MSYSTEM` in windows case, see https://github.com/angular/angular-cli/commit/b8d4e19fc4209ff6a52b6e6a151927f6fe34b60e
* require the locally vendored has-flag rather than npm package
* support browser runtimes by mocking out the process object if it doesn't exist

Architect is the tool that the CLI uses to perform complex tasks such as compilation, according to provided configurations.
The CLI commands run Architect targets such as `build`, `serve`, `test`, and `lint`.
Each named target has a default configuration, specified by an "options" object,
and an optional set of named alternate configurations in the "configurations" object.

For example, the "server" target for a newly generated app has a predefined
alternate configuration named "production".

You can define new targets and their configuration options in the "architect" section
of the `angular.json` file.
If you do so, you can run them from the command line using the `ng run` command.
Execute the command using the following format.

```
ng run project:target[:configuration]
```
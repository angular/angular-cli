The value of _settingOrProject_ is one of the following.

- "on" : Enables analytics gathering and reporting for the user.
- "off" : Disables analytics gathering and reporting for the user.
- "ci" : Enables analytics and configures reporting for use with Continuous Integration,
  which uses a common CI user.
- "prompt" : Prompts the user to set the status interactively.
- "project" : Sets the default status for the project to the _projectSetting_ value, which can be any of the other values. The _projectSetting_ argument is ignored for all other values of _settingOrProject_.

# Budgets

As applications grow in functionality, they also grow in size. Budgets is a feature in the
Angular CLI which allows you to set budget thresholds in your configuration to ensure parts
of your application stay within boundries which you set.

**.angular-cli.json**
```
{
  ...
  apps: [
    {
      ...
      budgets: []
    }
  ]
}
```

## Budget Definition

- type
  - The type of budget.
  - Possible values:
    - bundle - The size of a specific bundle.
    - initial - The initial size of the app.
    - allScript - The size of all scripts.
    - all - The size of the entire app.
    - anyScript - The size of any one script.
    - any - The size of any file.
- name
  - The name of the bundle.
  - Required only for type of "bundle"
- baseline
  - The baseline size for comparison.
- maximumWarning
  - The maximum threshold for warning relative to the baseline.
- maximumError
  - The maximum threshold for error relative to the baseline.
- minimumWarning
  - The minimum threshold for warning relative to the baseline.
- minimumError
  - The minimum threshold for error relative to the baseline.
- warning
  - The threshold for warning relative to the baseline (min & max).
- error
  - The threshold for error relative to the baseline (min & max).

## Specifying sizes

Available formats:

- `123` - size in bytes
- `123b` - size in bytes
- `123kb` - size in kilobytes
- `123mb` - size in megabytes
- `12%` - percentage

## NOTES

All sizes are relative to baseline.
Percentages are not valid for baseline values.

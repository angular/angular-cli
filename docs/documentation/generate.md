<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# ng generate

## Overview
`ng generate [name]` generates the specified blueprint

## Available blueprints:
 - [class](generate/class)
 - [component](generate/component)
 - [directive](generate/directive)
 - [enum](generate/enum)
 - [guard](generate/guard)
 - [interface](generate/interface)
 - [module](generate/module)
 - [pipe](generate/pipe)
 - [service](generate/service)

## Options
<details>
  <summary>dry-run</summary>
  <p>
    <code>--dry-run</code> (aliases: <code>-d</code>) <em>default value: false</em>
  </p>
  <p>
     Run through without making any changes. Will list all files that would have been created when running <code>ng generate</code>.
  </p>
</details>

<details>
  <summary>lint-fix</summary>
  <p>
    <code>--lint-fix</code> (aliases: <code>-lf</code>)
  </p>
  <p>
    Use lint to fix files after generation.
  </p>
  <p>
    You can also set default true to use lint every time after generation. To do this, change the value in <em>.angular-cli.json</em> (<code>apps[0].lintFix</code>).
  </p>
</details>

<details>
  <summary>verbose</summary>
  <p>
    <code>--verbose</code> (aliases: <code>-v</code>) <em>default value: false</em>
  </p>
  <p>
    Adds more details to output logging.
  </p>
</details>
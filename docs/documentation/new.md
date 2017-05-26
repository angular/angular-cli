<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# ng new

## Overview
`ng new [name]` creates a new angular application.

Default applications are created in a directory of the same name, with an initialized Angular application.

## Options
<details>
  <summary>directory</summary>
  <p>
    <code>--directory</code> (alias: <code>-dir</code>) <em>default value: dir</em>
  </p>
  <p>
    The directory name to create the app in.
  </p>
</details>

<details>
  <summary>dry-run</summary>
  <p>
    <code>--dry-run</code> (alias: <code>-d</code>) <em>default value: false</em>
  </p>
  <p>
    Run through without making any changes. Will list all files that would have been created when running <code>ng new</code>.
  </p>
</details>

<details>
  <summary>inline-style</summary>
  <p>
    <code>--inline-style</code> (alias: <code>-is</code>) <em>default value: false</em>
  </p>
  <p>
    Should have an inline style.
  </p>
</details>

<details>
  <summary>inline-template</summary>
  <p>
    <code>--inline-template</code> (alias: <code>-it</code>) <em>default value: false</em>
  </p>
  <p>
    Should have an inline template.
  </p>
</details>

<details>
  <summary>minimal</summary>
  <p>
    <code>--minimal</code> <em>default value: false</em>
  </p>
  <p>
    Should create a minimal app.
  </p>
</details>

<details>
  <summary>prefix</summary>
  <p>
    <code>--prefix</code> (alias: <code>-p</code>) <em>default value: app</em>
  </p>
  <p>
    The prefix to use for all component selectors.
  </p>
  <p>
    You can later change the value in <em>.angular-cli.json</em> (<code>apps[0].prefix</code>).
  </p>
</details>

<details>
  <summary>routing</summary>
  <p>
    <code>--routing</code> <em>default value: false</em>
  </p>
  <p>
    Generate a routing module.
  </p>
</details>

<details>
  <summary>skip-commit</summary>
  <p>
    <code>--skip-commit</code> (alias: <code>-sc</code>) <em>default value: false</em>
  </p>
  <p>
    Skip committing the first commit to git.
  </p>
</details>

<details>
  <summary>skip-git</summary>
  <p>
    <code>--skip-git</code> (alias: <code>-sg</code>) <em>default value: false</em>
  </p>
  <p>
    Skip initializing a git repository.
  </p>
</details>

<details>
  <summary>skip-install</summary>
  <p>
    <code>--skip-install</code> (alias: <code>-si</code>) <em>default value: false</em>
  </p>
  <p>
    Skip installing packages.
  </p>
</details>

<details>
  <summary>skip-tests</summary>
  <p>
    <code>--skip-tests (aliases: </code>-st) <em>default value: false</em>
  </p>
  <p>
    Skip creating spec files.
  </p>
  <p>
    Skip including e2e functionality.
  </p>
</details>

<details>
  <summary>source-dir</summary>
  <p>
    <code>--source-dir</code> (alias: <code>-sd</code>) <em>default value: src</em>
  </p>
  <p>
    The name of the source directory.
  </p>
  <p>
    You can later change the value in <em>.angular-cli.json</em> (<code>apps[0].root</code>).
  </p>
</details>

<details>
  <summary>style</summary>
  <p>
    <code>--style</code> <em>default value: css</em>
  </p>
  <div>
    The style file default extension. Possible values:
    <ul>
      <li>css</li>
      <li>scss</li>
      <li>less</li>
      <li>sass</li>
      <li>styl (<code>stylus</code>)<li>
    </ul>
  </div>
  <p>
    You can later change the value in <em>.angular-cli.json</em> (<code>defaults.styleExt</code>).
  </p>
</details>

<details>
  <summary>verbose</summary>
  <p>
    <code>--verbose</code> (alias: <code>-v</code>) <em>default value: false</em>
  </p>
  <p>
    Adds more details to output logging.
  </p>
</details>

<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# ng new

## Overview
`ng new [name]` creates a new angular application.

Default applications are created in a directory of the same name, with an initialized Angular application.

## Options
<details>
  <summary>collection</summary>
  <p>
    <code>--collection</code> (alias: <code>-c</code>) <em>default value: @schematics/angular</em>
  </p>
  <p>
    Schematics collection to use.
  </p>
</details>

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
    <code>--dry-run</code> (aliases: <code>-d</code> <code>-dryRun</code>) <em>default value: false</em>
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
    Specifies if the style will be in the ts file.
  </p>
</details>

<details>
  <summary>inline-template</summary>
  <p>
    <code>--inline-template</code> (alias: <code>-it</code>) <em>default value: false</em>
  </p>
  <p>
    Specifies if the template will be in the ts file.
  </p>
</details>

<details>
  <summary>minimal</summary>
  <p>
    <code>--minimal</code> <em>default value: false</em>
  </p>
  <p>
    Create a minimal app (no test structure, inline styles/templates).
  </p>
</details>

<details>
  <summary>prefix</summary>
  <p>
    <code>--prefix</code> (alias: <code>-p</code>) <em>default value: app</em>
  </p>
  <p>
    The prefix to apply to generated selectors.
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
    Generates a routing module.
  </p>
</details>

<details>
  <summary>service-worker</summary>
  <p>
    <code>--service-worker</code> <em>default value: false</em>
  </p>
  <p>
    Installs the @angular/service-worker.
  </p>
</details>

<details>
  <summary>skip-commit</summary>
  <p>
    <code>--skip-commit</code> (aliases: <code>-sc</code> <code>-skipCommit</code>) <em>default value: false</em>
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
    <code>--skip-install</code> (aliases: <code>-si</code> <code>-skipInstall</code>) <em>default value: false</em>
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
  <summary>style</summary>
  <p>
    <code>--style</code> <em>default value: css</em>
  </p>
  <div>
    The file extension to be used for style files. Possible values:
    <ul>
      <li>css</li>
      <li>scss</li>
      <li>less</li>
      <li>sass</li>
      <li>styl (<code>stylus</code>)</li>
    </ul>
  </div>
  <p>
    You can later change the value in <em>.angular-cli.json</em> (<code>defaults.styleExt</code>).
  </p>
</details>

<details>
  <summary>verbose</summary>
  <p>
    <code>--verbose</code> (aliases: <code>-v</code> <code>-verbose</code>) <em>default value: false</em>
  </p>
  <p>
    Adds more details to output logging.
  </p>
</details>

<details>
  <summary>view-encapsulation</summary>
  <p>
    <code>--view-encapsulation</code>
  </p>
  <div>
    Specifies the view encapsulation strategy. Possible values:
    <ul>
      <li>Emulated</li>
      <li>Native</li>
      <li>None</li>
    </ul>
  </div>
</details>
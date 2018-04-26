<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# ng generate service

## Overview
`ng generate service [name]` generates a service

## Options
<details>
  <summary>app</summary>
  <p>
    <code>--app</code> (aliases: <code>-a</code>) <em>default value: 1st app</em>
  </p>
  <p>
    Specifies app name to use.
  </p>
</details>

<details>
  <summary>flat</summary>
  <p>
    <code>--flat</code>
  </p>
  <p>
    Flag to indicate if a dir is created.
  </p>
</details>

<details>
  <summary>module</summary>
  <p>
    <code>--module</code> (aliases: <code>-m</code>)
  </p>
  <p>
    Specifies where the service should be provided.
  </p>
  <p>
    This should be the location of the file relative to the <code>app</code> directory. Two examples follow. The first adds the service to the default module that is provided when you first create a project with the cli. The second links to a module which can be found at <code>MyProject/src/app/my-module/my-module.module.ts</code>
  </p>
  <pre><code>ng generate service user --module app.module.ts</code></pre>
  <pre><code>ng generate service user --module my-module/my-module.module.ts</code></pre>
  

</details>

<details>
  <summary>spec</summary>
  <p>
    <code>--spec</code>
  </p>
  <p>
    Specifies if a spec file is generated.
  </p>
</details>

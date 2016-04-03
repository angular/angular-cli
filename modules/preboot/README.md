# preboot

Control server-rendered page before client-side web app loads.

**NOTE**: In the process of doing some major refactoring to this library.
It works and you can try it out, but just be aware that there will be major
changes coming soon.

## Key Features

1. Record and play back events
1. Respond immediately to events
1. Maintain focus even page is re-rendered
1. Buffer client-side re-rendering for smoother transition
1. Freeze page until bootstrap complete if user clicks button

## Installation

This is a server-side library that generates client-side code.
To use this library, you would first install it through npm:

```sh
npm install preboot
```

Then in your server-side code you would do something like this:

```es6
var preboot = require('preboot');
var prebootOptions = {};  // see options section below
var browserCode = preboot(prebootOptions);
```

You then inject browserCode into the HEAD section of your server-side template.
We want preboot to ONLY start recording once the web app root exists in the DOM. We are
still playing with the best way to do this (NOTE: we have tried onLoad and
it does not work because the callback does not get executed quickly enough).
For now, try putting the following
`preboot.start()` call immediately after your web app root in your server side template:

```html
<web-app-root-here>

</web-app-root-here>
<script>
    preboot.start();
</script>
```

Finally, once your client-side web app is "alive" it has to tell preboot that it is OK
to replay events.

```es6
preboot.complete();
```

## Options

There are 5 different types of options that can be passed into preboot:

**1. Selectors**

* `appRoot` - A selector that can be used to find the root element for the view (default is 'body')

**2. Strategies**

These can either be string values if you want to use a pre-built strategy that comes with the framework
or you can implement your own strategy and pass it in here as a function or object.

* `listen` - How preboot listens for events. See [Listen Strategies](docs/strategies.md#listen-strategies) below for more details.
* `replay` - How preboot replays captured events on client view. See [Replay Strategies](docs/strategies.md#replay-strategies) below for more details.
* `freeze` - How preboot freezes the screen when certain events occur. See [Freeze Strategies](docs/strategies.md#freeze-strategies) below for more details.

**3. Flags**

All flags false by default.

* `focus` - If true, will track and maintain focus even if page re-rendered
* `buffer` - If true, client will write to a hidden div which is only displayed after bootstrap complete
* `keyPress` - If true, all keystrokes in a textbox or textarea will be transferred from the server
view to the client view
* `buttonPress` - If true, button presses will be recorded and the UI will freeze until bootstrap complete
* `pauseOnTyping` - If true, the preboot will not complete until user focus out of text input elements
* `doNotReplay` - If true, none of the events recorded will be replayed

**4. Workflow Events**

These are the names of global events that can affect the preboot workflow:

* `pauseEvent` - When this is raised, preboot will delay the play back of recorded events (default 'PrebootPause')
* `resumeEvent` - When this is raised, preboot will resume the playback of events (default 'PrebootResume')

**5. Build Params**

* `uglify` - You can always uglify the output of the client code stream yourself, but if you set this
option to true preboot will do it for you.

# preboot

Manage transition from a server-generated view to a client-generated view.

## Key Features

1. Record and play back events
1. Respond immediately to events
1. Maintain focus even page is re-rendered
1. Buffer client-side re-rendering for smoother transition
1. Freeze page until bootstrap complete if user clicks button

## 3 Parts of Preboot

It is important to note that there are 3 differet parts of preboot:

1. **Inline** - This is the code that is injected into the HEAD of your server view and 
is in charge of recording all server view events.
2. **Node** - The node.js library for preboot really just exists to generate the inline code.
3. **Browser** - This client side library should not be inlined, but it should be loaded as a 
file BEFORE your client side application code. This library is in charge of replaying all the
events on the client view and then switching from server view to client view.

NOTE: The inline code will add an object `prebootData` onto the global window scope that contains
all the recorded events and other application details. The browser code will pick up this global
object and replay the events from this object onto the client view.

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
var inlinePrebootCode = preboot.getInlineCode(opts);
```

You then inject `inlinePrebootCode` into the HEAD section of your server-side template.
Then, at the very bottom of your `body` tag in your server-side template, add a reference
to the preboot client and have some way of calling `preboot.complete()`:

```html
<body>


  <script src="preboot_client.min.js"></script>
  <script>
  
    // have some way to call this once the client is done loading
    function callPrebootComplete() {
    
      // preboot is global object added by the preboot_client
      preboot.complete();
    }
  
  </script>
</body>
```

At a high level, you want to call `preboot.complete()` once the client is done bootstrapping/loading.
The exact way in which this is done will be different for each type of client side app. For Angular 2
for example, you can call it like this:

```es6
bootstrap(MyRootComponent, [PROVIDERS])
  .then(function () {
    preboot.complete();
  });
```

One thing to watch out for, though, is that if you are not caching data between your client and server,
then you should probably set up way of calling `preboot.complete()` after the initial client side async
calls are all done. Otherwise, the async calls may not complete until AFTER preboot is complete which 
likely will result in jank. HOWEVER, our recommendation for this is to focus on data caching rather
than trying to delay `preboot.complete()` until after async calls are done.

## Options

Here is a detailed explanation of each option you can pass into `getInlineCode(opts)` for the
node version of preboot.

* `eventSelectors` - This is an array of objects which specify what events preboot should be listening for 
on the server view and how preboot should replay those events to the client view. 
See Event Selector section below for more details but note that in most cases, you can just rely on the defaults
and you don't need to explicitly set anything here.
* `appRoot` - This is one or more selectors for apps in the page (i.e. so one string or an array of strings).
* `serverClientRoot` - This is an alternative to appRoot which can be used when you are doing manual buffering. 
The value here is an array of objects which contain `serverSelector` and `clientSelector`. 
See more in buffering section below. 
* `buffer` - If true, preboot will attempt to buffer client rendering to an extra hidden div. 
See more in buffering section below.
* `uglify` - If true, the code returned from `getInlineCode(opts)` will be uglified. 
* `noInlineCache` - By default the results of `getInlineCode(opts)` are cached internally for each different type
of `opts` object passed in. This is done for perf reasons in case it is being called at 
runtime for every server request.
* `window` - This will override the actual window object and is only used for testing purposes.

## Event Selectors

This part of the options drives a lot of the core behavior of preboot. 
Each event selector has the following properties:

* `selector` - The selector to find nodes under the server root (ex. `input,.blah,#foo`)
* `events` - An array of event names to listen for (ex. `['focusin', 'keyup', 'click']`)
* `keyCodes` - Only do something IF event includes a key pressed that matches the given key codes.
Useful for doing something when user hits return in a input box or something similar.
* `preventDefault` - If true, `event.preventDefault()` will be called to prevent any further event propagation.
* `freeze` - If true, the UI will freeze which means displaying a translucent overlay which prevents
any further user action until preboot is complete.
* `action` - This is a function callback for any custom code you want to run when this event occurs 
in the server view.
* `noReplay` - If true, the event won't be recorded or replayed. Useful when you utilize one of the other options above.

Here are some examples of event selectors from the defaults:

```es6
var eventSelectors = [

  // for recording changes in form elements
  { selector: 'input,textarea', events: ['keypress', 'keyup', 'keydown', 'input', 'change'] },
  { selector: 'select,option', events: ['change'] },

  // when user hits return button in an input box
  { selector: 'input', events: ['keyup'], preventDefault: true, keyCodes: [13], freeze: true },

  // for tracking focus (no need to replay)
  { selector: 'input,textarea', events: ['focusin', 'focusout', 'mousedown', 'mouseup'], noReplay: true },

  // user clicks on a button
  { selector: 'input[type="submit"],button', events: ['click'], preventDefault: true, freeze: true }
];
```

## Buffering

Buffering is when the client application initially renders to a hidden div and once the client is ready,
preboot will switch the server and client view in one shot. This is probably NOT needed for client-side 
frameworks that do a good job at hydration (i.e. re-using the server view) like React. For everyone
else, though, buffering is extremely useful (especially as your page becomes bigger and more complex)
 
There are two basic ways to do buffering with preboot:

1. **Automatic buffering** - This is where you let preboot generate an extra hidden div where your client 
app will write to. To do this, simply set `buffer: true` in your preboot options.
2. **Manual buffering** - This is where you manually create your own hidden div for your client view. To do
this, make sure you set `buffer: false` and then use `serverClientRoot` instead of `appRoot` in your 
preboot options so you can specify both `serverSelector` and `clientSelector`.

Why would you want manually handle buffering? This can be extremely useful for situations where you are 
NOT working with a truly isomorphic framework like React or Angular 2. So, for example, with Angular 1
or App Shell (from Progressive Web Apps).

## Contributor Notes

Some misc important things to keep in mind for contributors (in no particular order):

* There are no downstream dependencies for preboot. This is done on purpose to keep preboot as light as possible.
* There are only 3 main code files for preboot. One for each of the different parts (i.e. inline, browser, node). Don't
break from this paradigm for now.
* The transpiled `prebootstrap()` function is inlined in the server view, so it should be as small as possible 
(goal is to keep the uglified version under 3k).

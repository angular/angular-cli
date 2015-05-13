# WrenchJS

Hey there!

So you want to play around with wrenchjs?

It's easy. To set up the project on your machine, run these commands:
```bash
# Get the source code on your machine
git clone https://github.com/rodyhaddad/wrenchjs.git;
# Step inside the project
cd wrenchjs;
# Install the project dependency
npm install;
# Creates a global link, and exposes the bins of the project
npm link;
```

After you ran that, you now have a `wrenchjs` command line tool! It has the same interface as ember-cli for now.

You can use it to generate new projects, build them, serve them and so on.

But the stuff that are already provided are tailored for Ember projects.
You probably want it for Angular, and that's why you're playing with this!

You most likely want to develop new blueprints and addons.

To do that, copy the existing dummy-addon or dummy-blueprint.

If you want to know more about blueprints, check [here](https://github.com/ember-cli/ember-cli/blob/master/lib/models/blueprint.js#L37).
If you want to know more about addons, check [here](https://github.com/ember-cli/ember-cli/blob/master/ADDON_HOOKS.md) and [here](http://www.ember-cli.com/#developing-addons-and-blueprints).

Since wrenchjs is a customized proxy to wrenchjs, you can check the [existing ember-cli addons](http://www.emberaddons.com/) to get inspired.

To have addons discovered by the `wrenchjs` cli tool, put them in the package.json `ember-addon.paths`.

Addons should still use the `ember-addon` keyword in their package.json to get discovered for now.

If you have any questions, please let me know :-)

-------

A few Angular2 related blueprints have been developed in the `ng2-wrenchjs-cli` addon (located in the `addon` forlder).

To experiment with them, first execute the commands above to set up the `wrenchjs` cli on your machine.

Then go to wherever you want to generate your ng2 project and run:

```bash
wrenchjs new --blueprint=ng2 --skip-bower YOUR_PROJECT_NAME
```

That command will generate all the basic NG2 files, and install its npm dependencies.

To actually run it in your browser, you probably need to do something like:
```bash
cd YOUR_PROJECT_NAME
# Compile all the .ts files to adjavent .js
tsc
# Serve this directory using the npm `http-server` module.
http-server .
```

You can then generate NG2 components and services:

```bash
# Generate a component in src/compoenent
wrenchjs generate ng2-component COMPONENT_NAME
# Generate a component in src/service
wrenchjs generate ng2-service SERVICE_NAME
```

To use your components and services in your app, you'll need to use regular es6 imports and let Angular know about them.
WrenchJS doesn't help you with that for now.

Since you'll probably be developing the blueprints while experimenting with them, you probaly will want to link the dependency to your local copy

```bash
# This works because you ran `npm link` before, when you were in the wrenchjs project
npm link wrenchjs
```
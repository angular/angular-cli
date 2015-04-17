# WrenchJS

Hey there!

So you want to play around with wrenchjs?

It's easy. To set up the project on your machine, run these commands:
```bash
# Get the source code on your machine
git clone git@github.com:rodyhaddad/wrenchjs.git;
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

If you're curious, to have addons discovered by the `wrenchjs` cli tool, they either need to:

* Be in the `addon` directory of the project
* As a npm dependency to wrenchjs
* As a npm dependency to any "wrenchjs" project (meaning you're using `wrenchjs` in that project directory)

Addons should still use the `ember-addon` keyword in their package.json to get discovered for now.

If you have any questions, please let me know :-)

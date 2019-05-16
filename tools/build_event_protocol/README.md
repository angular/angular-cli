# build_event_protocol

This protocol is used to make streaming build results available for machines to
read and process.

See https://docs.bazel.build/versions/master/build-event-protocol.html

This directory contains an example program that parses a streaming JSON file
containing build events. It's useful for manually testing a program that emits
the build event protocol.

## Try it

First build the tool:

```sh
$ bazel build //tools/build_event_protocol:parse
```

Then produce a build event json file:

$ bazel test //... --build_event_json_file=bep.json

as soon as that process has started, you should be able to run in another window

$ bazel-bin/tools/build_event_protocol/parse bep.json


# Overview
Jobs is a high-order API that adds inputs, runtime type checking, sequencing, and other
functionality on top of RxJS' `Observable`s.

# Background
An `Observable` (at a higher level) is a function that receives a `Subscriber`, and outputs
multiple values, and finishes once it calls the `Subscriber.prototype.complete()` method (in
JavaScript):

```javascript
const output1To10EverySecond = function (subscriber) {
  let t = 0;
  const i = setInterval(() => {
    t++;
    subscriber.next(t);
    if (t === 10) {
      subscriber.complete(t);
    }
  }, 1000);
  return () => clearInterval(i);
};

const stream$ = new Observable(output1To10EverySecond);
// Start the function, and output 1 to 100, once per line.
stream$.subscribe(x => console.log(x));
```

This, of course, can be typed in TypeScript, but those types are not enforced at runtime.

# Glossary
- `job handler`. The function that implements the job's logic.
- `raw input`. The input observable sending messages to the job. These messages are of type
    `JobInboundMessage`.
- `raw output`. The output observer returned from the `job handler`. Messages on this observable
    are of type `JobOutboundMessage`.

# Description

A `JobHandler`, similar to observables, is a function that receives an argument and a context, and
returns an `Observable` of messages, which can include outputs that are typed at runtime (using a
Json Schema):

```javascript
const output1ToXEverySecond = function (x, context) {
  return new Observable(subscriber => {
    let t = 0;

    // Notify our users that the actual work is started.
    subscriber.next({ kind: JobOutboundMessageKind.Start });
    const i = setInterval(() => {
      t++;
      subscriber.next({ kind: JobOutboundMessageKind.Output, value: t });
      if (t === x) {
        subscriber.next({ kind: JobOutboundMessageKind.End });
        subscriber.complete();
      }
    }, 1000);

    return () => {
      clearInterval(i);
    };
  })
};

// For now, jobs can not be called without a registry and scheduler.
const registry = new SimpleJobRegistry();
registry.register('output-from-1-to-x', output1ToXEverySecond, {
  argument: { type: 'number' },
  output: { type: 'number' },
});
const scheduler = new SimpleScheduler(registry);

// Need to keep the same name that the registry would understand.
// Count from 1 to 10.
const job = scheduler.schedule('output-from-1-to-x', 10);

// A Job<> instance has more members, but we only want the output values here.
job.output.subscribe(x => console.log(x));
```

This seems like a lot of boilerplate in comparison, but there are a few advantages;

1. lifecycle. Jobs can tell when they start doing work and when work is done.
1. everything is typed, even at runtime.
1. the context also contains an input Observable that receives typed input messages, including
    input values, and stop requests.
1. jobs can also schedule other jobs and wait for them, even if they don't know if a job is
    implemented in the system.

## Diagram
A simpler way to think about jobs in contrast to observables is that job are closer to a Unix
process. It has an argument (command line flags), receive inputs (STDIN and interrupt signals),
and output values (STDOUT) as well as diagnostic (STDERR). They can be plugged one into another
(piping), and can be transformed, synchronized and scheduled (fork, exec, cron).

```plain
- given A the type of the argument
- given I the type of the input
- given O the type of the output

                              ,______________________   
    JobInboundMessage<I> --> | handler(argument: A) |  --> JobOutboundMessage<O>
                                                            - JobOutboundMessageKind.Output
                                                            - ...
```

`JobInboundMessage` includes:

1. `JobInboundMessageKind.Ping`. A simple message that should be answered with
    `JobOutboundMessageKind.Pong` when the job is responsive. The `id` field of the message should
    be used when returning `Pong`.
1. `JobInboundMessageKind.Stop`. The job should be stopped. This is used when
    cancelling/unsubscribing from the `output` (or by calling `stop()`). Any inputs or outputs
    after this message will be ignored.
1. `JobInboundMessageKind.Input` is used when sending inputs to a job. These correspond to the
    `next` methods of an `Observer` and are reported to the job through its `context.input`
    Observable. There is no way to communicate an error to the job.

`JobOutboundMessage` includes:

1. `JobOutboundMessageKind.Ready`. The `Job<>` was created, its dependencies are done, and the
    library is validating Argument and calling the internal job code.
1. `JobOutboundMessageKind.Start`. The job code itself should send that message when started.
    `createJobHandler()` will do it automatically.
1. `JobOutboundMessageKind.End`. The job has ended. This is done by the job itself and should
    always be sent when completed. The scheduler will listen to this message to set the state and
    unblock dependent jobs. `createJobHandler()` automatically send this message.
1. `JobOutboundMessageKind.Pong`. The job should answer a `JobInboundMessageKind.Ping` message with
    this. Automatically done by `createJobHandler()`.
1. `JobOutboundMessageKind.Output`. An `Output` has been generated by the job.
1. `JobOutboundMessageKind.ChannelMessage`, `JobOutboundMessageKind.ChannelError` and
    `JobOutboundMessageKind.ChannelComplete` are used for output channels. These correspond to
    the `next`, `error` and `complete` methods of an `Observer` and are available to the callee
    through the `job.channels` map of Observable.

Utilities should have some filtering and dispatching to separate observables, as a convenience for
the user. An example of this would be the `Job.prototype.output` observable which only contains
the value contained by messages of type `JobOutboundMessageKind.Output`.

# Higher Order Jobs
Because jobs are expected to be pure functions, they can be composed or transformed to create
more complex behaviour, similar to how RxJS operators can transform observables.

```javascript
// Runs a job on the hour, every hour, regardless of how long the job takes.
// This creates a job function that can be registered by itself.
function scheduleJobOnTheHour(jobFunction) {
  return function(argument, context) {
    return new Observable(observer => {
      let timeout = 0;
   
      function _timeoutToNextHour() {
        // Just wait until the next hour.
        const t = new Date();
        const secondsToNextHour = 3600 - t.getSeconds() - t.getMinutes() * 60;
        timeout = setTimeout(_scheduleJobAndWaitAnHour, secondsToNextHour);
      }
   
      function _scheduleJobAndWaitAnHour() {
        jobFunction(argument, context).subscribe(
          message => observer.next(message),
          error => observer.error(error),
          // Do not forward completion, but use it to schedule the next job run.
          () => {
            _timeoutToNextHour();
          },
        );
      }
   
      // Kick off by waiting for next hour.
      _timeoutToNextHour();
   
      return () => clearTimeout(timeout);
    });
  };
}
```

Another way to compose jobs is to schedule jobs based on their name, from other jobs.

```javascript
// Runs a job on the hour, every hour, regardless of how long the job takes.
// This creates a high order job by getting a job name and an argument, and scheduling the job
// every hour.
function scheduleJobOnTheHour(job, context) {
  const { name, argument } = job;  // Destructure our input.

  return new Observable(observer => {
    let timeout = 0;

    function _timeoutToNextHour() {
      // Just wait until the next hour.
      const t = new Date();
      const secondsToNextHour = 3600 - t.getSeconds() - t.getMinutes() * 60;
      timeout = setTimeout(_scheduleJobAndWaitAnHour, secondsToNextHour);
    }

    function _scheduleJobAndWaitAnHour() {
      const subJob = context.scheduler.schedule(name, argument);
      // We do not forward the input to the sub-job but that would be a valid example as well.
      subJob.outboundBus.subscribe(
        message => observer.next(message),
        error => observer.error(error),
        // Do not forward completion, but use it to schedule the next job run.
        () => {
          _timeoutToNextHour();
        },
      );
    }

    // Kick off by waiting for next hour.
    _timeoutToNextHour();

    return () => clearTimeout(timeout);
  });
}

const registry = new SimpleJobRegistry();
registry.register('schedule-job-on-the-hour', scheduleJobOnTheHour, {
  argument: {
    properties: {
      name: { type: 'string' },
      argument: { type: true },
    },
  },
});

// Implementation left to the reader.
registry.register('copy-files-from-a-to-b', require('some-package/copy-job'));

const scheduler = new SimpleScheduler(registry);

// A rudimentary backup system.
const job = scheduler.schedule('schedule-job-on-the-hour', {
  name: 'copy-files-from-a-to-b',
  argument: {
    from: '/some-directory/to/backup',
    to: '/volumes/usb-key',
  },
});
job.output.subscribe(x => console.log(x));
```

# Limitations
Jobs input, output and argument must be serializable to JSONs. This is a big limitation in usage,
but comes with the benefit that jobs can be serialized and called across memory boundaries. An
example would be an operator that takes a module path and run the job from that path in a separate
process. Or even a separate server, using HTTP calls.
 
Another limitation is that the boilerplate is complex. Manually managing start/end life cycle, and
other messages such as ping/pong, etc. is tedious and requires a lot of code. A good way to keep
this limitation under control is to provide helpers to create `JobHandler`s which manage those
messages for the developer. A simple handler could be to get a `Promise` and return the output of
that promise automatically.

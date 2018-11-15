# Description

Jobs is the Angular DevKit subsystem for scheduling and running generic functions with clearly 
typed inputs and outputs. A `Job` instance is a function associated with metadata. You can
schedule a job, synchronize it with other jobs, and use it to schedule other jobs.

The whole API is serializable, allowing you to use a Node Stream or message channel to
communicate between the job and the job scheduler.

Jobs are lazy, cold, and guaranteed to execute exactly once when scheduled. Subscribing to a job
returns messages from the point where the job is at.

## Argument, Input, Output and Channels
A job receives a single argument when scheduled and can also listen to an input channel. It can
emit multiple outputs, and can also provide multiple output channels that emit asynchronous JSON 
messages, which can be typed. 

The I/O model is like that of an executable, where the argument corresponds to arguments on the 
command line, the input channel to STDIN, the output channel to STDOUT, and the channels
would be additional output streams.

In addition, a `Job` has a logging channel that can be used to log messages to the user. The 
code that schedules the job must listen for or forward these messages. You can think of those
messages as STDERR.

## LifeCycle
A `Job` goes through multiple LifeCycle messages before its completion;
1. `JobState.Queued`. The job was queued and is waiting. This is the default state from the
    scheduler.
1. `JobState.Ready`. The job's dependencies (see
    ["Synchronizing and Dependencies"](#Dependencies)) are done running, the argument is 
    validated, and the job is ready to execute.
1. `JobState.Started`. The argument has been validated, the job has been called and is running. 
    This is handled by the job itself (or `createJobHandler()`).
1. `JobState.Ended`. The job has ended and is done running. This is handled by the job itself (or 
    `createJobHandler()`).
1. `JobState.Errored`. A unrecoverable error happened.

Each state (except `Queued`) corresponds to a `JobOutboundMessage` on the `outboundBus` observable
that triggers the state change. The `Scheduler` emits the `Ready` and `Errored` messages; the job 
implementation should not emit them, and if it does they are filtered out. You can listen for 
these messages or use the corresponding state member.

The job implementation should emit the `Start` and `End` messages when it is starting the job logic
itself. Only the first `Start` and `End` messages will be forwarded. Any more will be filtered out.

The `Queued` state is set as the job is scheduled, so there is no need to listen for the message.

## `Job<OutputType>` Object
The `Job` object that is returned when you schedule a job provides access to the job's status and 
utilities for tracking and modifying the job. 

1. `id`. A unique symbol that can be used as a Map key.
1. `description`. The description of the job from the scheduler. See `JobDescription` object.
1. `argument`. The argument value that was used to start the job.
1. `input`. An `Observer` that can be used to send validated inputs to the job itself.
1. `output`. An `Observable<OutputType>` that filters out messages to get only the returned output
    of a job.
1. `promise`. A promise that waits for the last output of a job. Returns the last value outputted
    (or no value if there's no last value).
1. `state`. The current state of the job (see `LifeCycle`).
1. `channels`. A map of side channels the user can listen to as `Observable`.
1. `ping()`. A function that can be used to ping the job, receiving a `Promise` for when the ping
    is answered.
1. `stop()`. Sends a `stop` input to the job, which suggests to stop the job. The job itself can
    choose to ignore this message.
1. `inboundBus`. The raw input `Observer<JobInboundMessage>`. This can be used to send messages to
    the `context.inboundBus` observable in the job. These are `JobInboundMessage` messages. See
    ["Communicating With Jobs"](#Communicating).
1. `outboundBus`. The raw output `Observable<JobOutput>`. This can be used to listen to messages
    from the job. See ["Communicating With Jobs"](#Communicating).
   
## `JobHandlerContext<I, O>` Object
The `JobHandlerContext<>` is passed to the job handler code in addition to its argument. The
context contains the following members:

1. `description`. The description of the job. Its name and schemas.
1. `scheduler`. A `Scheduler<>` instance that can be used to create additional jobs.
1. `dependencies`. A generic list of other job instances that were run as dependencies when
    scheduling this job. Their `id` is not guaranteed to match the `id` of the `Job<>` instance 
    itself (those `Job<>`s might just be proxies). The state of those `Job<>` is guaranteed to be
    `JobState.Ended`, as `JobState.Errored` would have prevented this handler from running.
1. `inboundBus`. The raw input observable, complement of the `inboundBus` observer from the `Job<>`.

# Examples

An example of a job that adds all input together and return the output value. We use a 
simple synchronous job registry and a simple job scheduler.

```typescript
import { jobs } from '@angular-devkit/core';

const add = jobs.createJobHandle<number[], number>(
  input => input.reduce((total, curr) => total + curr, 0),
);

// Register the job in a SimpleJobRegistry. Different registries have different API.
const registry = new jobs.SimpleJobRegistry();
const scheduler = new jobs.SimpleScheduler(registry);
registry.register(add, {
  name: 'add',
  input: { type: 'array', items: { type: 'number' } },
  output: { type: 'number' },
});

scheduler.schedule('add', [1, 2, 3, 4]).promise
  .then(output => console.log('1 + 2 + 3 + 4 is ' + output));
```

# Creating Jobs

A job is at its core a function with a description object attached to it. The description object
stores the JSON schemas used to validate the types of the argument passed in, the input and
output values. By default, a job accepts and can output any JSON object.

```typescript
import { Observable } from 'rxjs';
import { jobs } from '@angular-devkit/core';

const argument = {
  type: 'array', items: { type: 'number' },
};
const output = {
  type: 'number',
};

export function add(argument: number[]): Observable<jobs.JobOutboundMessage<number>> {
  return new Observable(o => {
    o.next({ kind: jobs.JobOutboundMessageKind.Start });
    o.next({
      kind: jobs.JobOutboundMessageKind.Output,
      output: argument.reduce((total, curr) => total + curr, 0),
    });
    o.next({ kind: jobs.JobOutboundMessageKind.End });
    o.complete();
  });
}

// Add a property to `add` to make it officially a JobHandler. The Job system does not recognize
// any function as a JobHandler.
add.jobDescription = {
  argument: argument,
  output: output,
};

// Call the job with an array as argument, and log its output.
declare const scheduler: jobs.Scheduler;
scheduler.schedule('add', [1, 2, 3, 4])
    .output.subscribe(x => console.log(x));  // Will output 10.
```

This is a lot of boilerplate, so we made some helpers to improve readability and manage argument, 
input and output automatically:

```typescript
// Add is a JobHandler function, like the above.
export const add = jobs.createJobHandler<number[], number>(
  argument => argument.reduce((total, curr) => total + curr, 0),
);

// Schedule like above.
```

You can also return a Promise or an Observable, as jobs are asynchronous. This helper will set
start and end messages appropriately, and will pass in a logger. It will also manage channels
automatically (see below).

A more complex job can be declared like this:

```typescript
import { Observable } from 'rxjs';
import { jobs } from '@angular-devkit/core';

// Show progress with each count in a separate output channel. Output "more" in a channel.
export const count = jobs.createJobHandler<number, number>(
  // Receive a context that contains additional methods to create channels.
  (argument: number, { createChannel }) => new Observable<number>(o => {
    const side = createChannel('side', { type: 'string', const: 'more' });
    const progress = createChannel('progress', { type: 'number' });
    let i = 0;
    function doCount() {
      o.next(i++);
      progress.next(i / argument);
      side.next('more');
  
      if (i < argument) {
        setTimeout(doCount, 100);
      } else {
        o.complete();
      }
    }
    setTimeout(doCount, 100);
  }),
  {
    argument: { type: 'number' },
    output: { type: 'number' },
  },
);

// Get a hold of a scheduler that refers to the job above.
declare const scheduler: jobs.Scheduler;

const job = scheduler.schedule('count', 0);
job.getChannel('side').subscribe(x => console.log(x));
// You can type a channel too. Messages will be filtered out.
job.getChannel<number>('progress', { type: 'number' }).subscribe(x => console.log(x));
```

## <a name="Communicating"></a>Communicating With Jobs
Jobs can be started and updated in a separate process or thread, and as such communication with a 
job should avoid using global objects (which might not be shared). The jobs API and schedulers
provide 2 communication streams (one for input and the other for output), named `inboundBus` and 
`outboundBus`.

### Raw Input Stream
The `schedule()` function returns a `Job<>` interface that contains a `inboundBus` member of type
`Observer<JobInboundMessage>`. All messages sent _to_ the job goes through this stream. The `kind`
member of the `JobInboundMessage` interface dictates what kind of message it is sending:

1. `JobInboundMessageKind.Ping`. A simple message that should be answered with
    `JobOutboundMessageKind.Pong` when the job is responsive. The `id` field of the message should
    be used when returning `Pong`.
1. `JobInboundMessageKind.Stop`. The job should be stopped. This is used when
    cancelling/unsubscribing from the `output` (or by calling `stop()`). Any inputs or outputs
    after this message will be ignored.
1. `JobInboundMessageKind.Input` is used when sending inputs to a job. These correspond to the
    `next` methods of an `Observer` and are reported to the job through its `context.input`
    Observable. There is no way to communicate an error to the job.

Using the `createJobHandler()` helper, all those messages are automatically handled by the
boilerplate code. If you need direct access to raw inputs, you should subscribe to the
`context.inboundBus` Observable.

### Raw Output Stream
The `Job<>` interface also contains a `outboundBus` member (of type
`Observable<JobOutboundMessage<O>>` where `O` is the typed output of the job) which is the output
complement of `inboundBus`. All messages sent _from_ the job goes through this stream. The `kind`
member of the `JobOutboundMessage<O>` interface dictates what kind of message it is sending:

1. `JobOutboundMessageKind.Create`. The `Job<>` was created, its dependencies are done, and the
    library is validating Argument and calling the internal job code.
1. `JobOutboundMessageKind.Start`. The job code itself should send that message when started.
    `createJobHandler()` will do it automatically.
1. `JobOutboundMessageKind.End`. The job has ended. This is done by the job itself and should always
    be sent when completed. The scheduler will listen to this message to set the state and unblock
    dependent jobs. `createJobHandler()` automatically send this message.
1. `JobOutboundMessageKind.Pong`. The job should answer a `JobInboundMessageKind.Ping` message with
    this. Automatically done by `createJobHandler()`.
1. `JobOutboundMessageKind.Log`. A logging message (side effect that should be shown to the user).
1. `JobOutboundMessageKind.Output`. An `Output` has been generated by the job.
1. `JobOutboundMessageKind.ChannelMessage`, `JobOutboundMessageKind.ChannelError` and
    `JobOutboundMessageKind.ChannelComplete` are used for output channels. These correspond to the
    `next`, `error` and `complete` methods of an `Observer` and are available to the callee through
    the `job.channels` map of Observable.

Those messages can be accessed directly through the `job.outboundBus` member. The job itself should
return an `Observable<JobOutboundMessage<O>>`. The `createJobHandler()` helper handles most of use
cases of this and makes it easier for jobs to handle this.

## Job Dispatchers
Dispatchers are a helper that redirect to different jobs given conditions. To create a job 
dispatcher, use the `createDispatcher()` function:

```typescript
import { jobs } from '@angular-devkit/core';

// A dispatcher that installs node modules given a user's preference.
const dispatcher = jobs.createDispatcher({
  name: 'node-install',
  argument: { properties: { moduleName: { type: 'string' } } },
  output: { type: 'boolean' },
});

const npmInstall = jobs.createJobHandler(/* ... */, { name: 'npm-install' });
const yarnInstall = jobs.createJobHandler(/* ... */, { name: 'yarn-install' });
const pnpmInstall = jobs.createJobHandler(/* ... */, { name: 'pnpm-install' });

declare const registry: jobs.SimpleJobRegistry;
registry.register(dispatcher);
registry.register(npmInstall);
registry.register(yarnInstall);
registry.register(pnpmInstall);

// Default to npm.
dispatcher.setDefaultDelegate(npmInstall.name);
// If the user is asking for yarn over npm, uses it.
dispatcher.addConditionalDelegate(() => userWantsYarn, yarnInstall.name);
```

## Execution Strategy
Jobs are always run in parallel and will always start, but many helper functions are provided 
when creating a job to help you control the execution strategy;

1. `serialize()`. Multiple runs of this job will be queued with each others.
1. `memoize(replayMessages = false)` will create a job, or reuse the same job  when inputs are 
matching. If the inputs don't match, a new job will be started and its outputs will be stored.

These strategies can be used when creating the job:

```typescript
// Same input and output as above.

export const add = jobs.strategy.memoize()(
  jobs.createJobHandler<number[], number>(
      argument => argument.reduce((total, curr) => total + curr, 0),
  ),
);
```

Strategies can be reused to synchronize between jobs. For example, given jobs `jobA` and `jobB`, 
you can reuse the strategy to serialize both jobs together;

```typescript
const strategy = jobs.strategy.serialize();
const jobA = strategy(jobs.createJobHandler(...));
const jobB = strategy(jobs.createJobHandler(...));
```

Even further, we can have package A and package B run in serialization, and B and C also be 
serialized. Running A and C will run in parallel, while running B will wait for both A and C 
to finish.

```typescript
const strategy1 = jobs.strategy.serialize();
const strategy2 = jobs.strategy.serialize();
const jobA = strategy1(jobs.createJobHandler(...));
const jobB = strategy1(strategy2(jobs.createJobHandler(...)));
const jobC = strategy2(jobs.createJobHandler(...));
```

# Scheduling Jobs
Jobs can be scheduled using a `Scheduler` interface, which contains a `schedule()` method:

```typescript
interface Scheduler {
  /**
   * Schedule a job to be run, using its name.
   * @param name The name of job to be run.
   * @param argument The argument to send to the job when starting it.
   * @param options Scheduling options.
   * @returns The Job being run.
   */
  schedule<I extends MinimumInputValueT, O extends MinimumOutputValueT>(
    name: JobName,
    argument: I,
    options?: ScheduleJobOptions,
  ): Job<JsonValue, O>;
}
```

The scheduler also has a `getDescription()` method to get a `JobDescription` object for a certain 
name; that description contains schemas for the argument, input, output, and other channels:

```typescript
interface Scheduler {
  /**
   * Get a job description for a named job.
   *
   * @param name The name of the job.
   * @returns A description, or null if the job cannot be scheduled.
   */
  getDescription(name: JobName): JobDescription | null;
    
  /**
   * Returns true if the job name has been registered.
   * @param name The name of the job.
   * @returns True if the job exists, false otherwise.
   */
  has(name: JobName): boolean;
}
```

Finally, the scheduler interface has a `pause()` method to stop scheduling. This will queue all 
jobs and wait for the unpause function to be called before unblocking all the jobs scheduled. 
This does not affect already running jobs.

```typescript
interface Scheduler {
  /**
   * Pause the scheduler, temporary queueing _new_ jobs. Returns a resume function that should be
   * used to resume execution. If multiple `pause()` were called, all their resume functions must
   * be called before the Scheduler actually starts new jobs. Additional calls to the same resume
   * function will have no effect.
   *
   * Jobs already running are NOT paused. This is pausing the scheduler only.
   *
   * @returns A function that can be run to resume the scheduler. If multiple `pause()` calls
   *          were made, all their return function must be called (in any order) before the
   *          scheduler can resume.
   */
  pause(): () => void;
}
```

## <a name="Dependencies"></a>Synchronizing and Dependencies
When scheduling jobs, it is often necessary to run jobs after certain other jobs are finished. 
This is done through the `dependencies` options in the `schedule()` method.

These jobs will also be passed to the job being scheduled, through its context. This can be
useful if, for example, the output of those jobs are of a known type, or have known side channels.

An example of this would be a compiler that needs to know the output directory of other compilers
before it, in a tool chain.

### Dependencies
When scheduling jobs, the user can add a `dependencies` field to the scheduling options. The
scheduler will wait for those dependencies to finish before running the job, and pass those jobs 
in the context of the job.

### Accessing Dependencies
Jobs are called with a `JobHandlerContext` as a second argument, which contains a
`dependencies: Job<JsonValue>[]` member which contains all dependencies that were used when 
scheduling the job. Those aren't fully typed as they are determined by the user, and not the job
itself. They also can contain jobs that are not finished, and the job should use the `state`
member of the job itself before trying to access its content.

### Scheduler Sub Jobs
The `JobHandlerContext` also contains a `scheduler` member which can be used to schedule jobs
using the same scheduler that was used for the job. This allows jobs to call other jobs
and wait for them to end.

## Available Schedulers
The Core Angular DevKit library provides 2 implementations for the `Scheduler` interface:

## SimpleJobRegistry
Available in the jobs namespace. A registry that accept job registration, and can also schedule
jobs.

```typescript
import { jobs } from '@angular-devkit/core';

const add = jobs.createJobHandler<number[], number>(
  argument => argument.reduce((total, curr) => total + curr, 0),
);

// Register the job in a SimpleJobRegistry. Different registries have different API.
const registry = new jobs.SimpleJobRegistry();
const scheduler = new SimpleJobScheduler(registry);

registry.register(add, {
  name: 'add',
  argument: { type: 'array', items: { type: 'number' } },
  output: { type: 'number' },
});

scheduler.schedule('add', [1, 2, 3, 4]);
```

## NodeModuleJobRegistry
Available through `@angular-devkit/core/node`.

A scheduler that loads jobs using their node package names. These jobs need to use the
`createJobHandler()` helper and report their argument/input/output schemas that way.

```typescript
declare const registry: NodeModuleJobRegistry;
const scheduler = new SimpleJobScheduler(registry);

scheduler.schedule('some-node-package#someExport', 'input');
```

# Gotchas

1. Deadlocking Dependencies  
   It is impossible to add dependencies to an already running job, but it is entirely possible to 
   get locked between jobs. Be aware of your own dependencies.

1. Using `job.promise`  
    `job.promise` waits for the job to ends. Don't rely on it unless you know the job is not 
    watching and running for a long time. If you aren't sure, use
    `job.output.pipe(first()).toPromise()` instead which will return the first next output, 
    regardless of whether the job watches and rerun or not.


# FAQ

1. Laziness  
    A job is lazy until executed, but its messages will be replayed when resubscribed.

1. Serialize Strategy vs Dependencies  
    Strategies are functions that transform the execution of a job, and can be used when
    declaring the job, or registering it. Dependencies, on the other hand, are listed when
    scheduling a job to order jobs during scheduling.
    
    A job has no control over the way it's scheduled, and its dependencies. It can, however,
    declare that it shouldn't run at the same time as itself. Alternatively, a user could
    schedule a job twice and imply that the second run should wait for the first to finish. In
    practice, this would be equivalent to having the job be serialized, but the important detail 
    is in _whom_ is defining the rules; using the `serialize()` strategy, the job implementation
    is, while when using dependencies, the user is.
    
    The user does not need to know how to job needs to synchronize with itself, and the job does
    not need to know how it synchronizes with other jobs that it doesn't know about. That's part 
    of the strength of this system as every job can be developed in a vacuum, only caring about
    its contracts (argument, input and output) and its own synchronization.

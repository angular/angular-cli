# Jobs

Jobs is the Angular DevKit subsystem for scheduling and running generic functions with clearly 
typed inputs and outputs. A Job is 

The whole API is serializable, allowing someone to use a Node Stream or message channel to 
communicate between the job and the job scheduler.

## Input, Output and Channels
Jobs can emit multiple outputs, and receives an input when first started. In addition, jobs can
listen to an input channel, and multiple output channels. Those channels are asynchronous
JSON messages that can be typed.

If a Job was an executable, the input would be the arguments on the command line, the input 
channel would be STDIN, the output channel would be STDOUT and STDERR (through Observable errors),
and the channels would be additional pipes out.

# Creating Jobs

A job is at its core a function with a Schema associated to it;

```typescript
import { Observable } from 'rxjs';
import { jobs } from '@angular-devkit/core';

const input = {
  type: 'array', items: { type: 'number' },
};
const output = {
  type: 'number',
};

export function add(input: number[]): Observable<jobs.JobEvent<number>> {
  return new Observable(o => {
    o.next({ kind: jobs.JobEventKind.Start });
    o.next({
      kind: jobs.JobEventKind.Output,
      output: input.reduce((total, curr) => total + curr, 0),
    });
    o.next({ kind: jobs.JobEventKind.End });
  });
}

// Register the job in a SimpleJobRegistry. Different registries have different API.
declare const registry: SimpleJobRegistry;
registry.register('add', add, {
  input: input,
  output: output,
});

// Calling the job, and logging its output.
declare const scheduler: jobs.Scheduler;
scheduler.schedule('add', [1, 2, 3, 4])
    .output.subscribe(x => console.log(x));  // Will output 10.
```

This is a lot of boilerplate, so we made some helpers to improve readability and manage input 
and output automatically;

```typescript
// Add is a JobHandler function, like the above.
export const add = jobs.createJob<number[], number>(
  input => input.reduce((total, curr) => total + curr, 0),
);

// Schedule like above.
```

You can also return a Promise or an Observable, as jobs are asynchronous. This helper will set 
progress to 0, start and end events appropriately, and will pass in a logger. It will also manage
channels automatically (see below).

A more complex job can be declared like this:

```typescript
import { Observable } from 'rxjs';
import { JobRegistry } from './api'

// Show progress with each count. Output "more" in a channel.
export const count = jobs.createJob<number, number>(
  // Receive a context that contains additional methods, like progress, logger and channels.
  (input: number, { progress, channels }) => new Observable<number>(o => {
    let i = 0;
    function doCount() {
      o.next(i++);
      progress(i / input);
      channels['side'].next('more');
  
      if (i < input) {
        setTimeout(doCount, 100);
      } else {
        o.complete();
      }
    }
    setTimeout(doCount, 100);
  }),
  {
      input: { type: 'number' },
      output: { type: 'number' },
      channels: {
        'side': { type: 'string', const: 'more' },
      },
  },
);

declare const registry: JobRegistry;
// Register this job with `registry.register('count', count)`.

const job = registry.schedule('count');
job.channels['side'] && job.channels['side'].subscribe((x: json.JsonValue) => console.log(x));
const c = job.getChannel<string>('side', { type: 'string' });
if (c) {
  c.subscribe((x: string) => console.log(x));
}
```

## Job Extension
A Job can extend other jobs, meaning their inputs and outputs have to be a superset of the job 
extended. This is useful for making compatible jobs that can be replaced by others.

## Job Groups
Groups are an additional way to synchronize and execute logic on scheduling the job, from the 
side of the scheduler. This logic will always apply in the thread the job is scheduled, and not
where the job is created/registered.

Job groups are a job helper that redirect to different jobs. To create a job group, use the
`createGroup()` function:

```typescript
import { jobs } from '@angular-devkit/core';

// A group that installs node modules.
const group = jobs.createGroup({
  name: 'node-install',
  input: {
    properties: {
      moduleName: { type: 'string' },
    },
  },
  output: { type: 'boolean' },
});

// Extending makes sure the input and output matches the group.
const npmInstall = jobs.createJob(/* ... */, { name: 'npm-install', extends: group });
const yarnInstall = jobs.createJob(/* ... */, { name: 'yarn-install', extends: group });
const pnpmInstall = jobs.createJob(/* ... */, { name: 'pnpm-install', extends: group });

declare const registry: jobs.SimpleJobRegistry;
registry.register(group);
registry.register(npmInstall);
registry.register(yarnInstall);
registry.register(pnpmInstall);

// Default to npm.
group.setDefaultDelegate(npmInstall.name);
// If the user is asking for yarn over npm, uses it.
group.addConditionalDelegate(() => userWantsYarn, yarnInstall.name);
```

## Execution Strategy

Jobs are always run in parallel and will always start, but many helper functions are provided 
when creating a job to help you control the execution strategy;

1. `serialize()`. Multiple runs of this job will be queued with each others.
1. `reuse(replayEvents = false)`. Jobs with this strategy will reuse an already running job. If 
`replayEvents` is true, all events will be replayed in the same order.
1. `memoize(replayEvents = false)` will create a job, or reuse the same job  when inputs are 
matching. If the inputs don't match, a new job will be started and its outputs will be stored.

These strategies can be used when creating the job:

```typescript
// Same input and output as above.

export const add = jobs.strategy.memoize()(
  jobs.createJob<number[], number>(
      input => input.reduce((total, curr) => total + curr, 0),
  ),
);
```

Strategies can be reused to synchronize between jobs. For example, given jobs `jobA` and `jobB`, 
you can reuse the strategy to serialize both jobs together;

```typescript
const strategy = jobs.strategy.serialize();
const jobA = strategy(jobs.createJob(...));
const jobB = strategy(jobs.createJob(...));
```

# Executing Jobs

## SimpleJobRegistry
A registry that accept job registration, and can also schedule jobs.

## NodeModuleJobScheduler
A scheduler that loads jobs using their node package names. These jobs need to use the
`createJob()` helper and report their input/output schemas that way.

```javascript
declare const scheduler: NodeModuleJobScheduler;

scheduler.schedule('some-node-package#someExport', 'input');
```

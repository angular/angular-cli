# Docker Deploy - Design

## Abstract

Add convenience for users to containerize and deploy their Angular application via Docker.

Provide tasks for common Docker workflows:

* Generate starter `Dockerfile` and `docker-compose.yml` files.
* Build and Push an Angular app image to a Docker Registry.
* Deploy and run an Angular app container in different Docker Machine environments.


## Requirements

1. Requires user to have Docker CLI tools installed.
   (See also: ["Implementation Approaches"](#implementation-approaches))
1. User is free to use the Angular CLI without Docker. By default, do not generate Docker files upon creation of a new project (`ng new`, `ng init`).
1. Don't recreate the wheel. Implement the common Docker use cases that make it convenient for Angular applications.
1. Don't inhibit users from using the standalone Docker CLI tools for other use cases.
1. Assumes 1:1 Dockerfile with Angular project. Other services should be outside (or sibling to) the ng app project folder.
1. Generated starter Dockerfile will use the current official Node.js LTS base image.
1. Generated Dockerfile will use `npm run docker-start` as its default CMD. Requires new `package.json` script.
1. User is free to modify and customize all generated files directly without involvement by the Angular CLI.
1. Image builds will support all Docker build options.
1. Container deploys will support all Docker run options.
1. Deploying to a Docker Machine can be local or remote.
1. Deploys can be made to different environments (dev, stage, prod) on the same or different Docker Machines.
1. Image pushes can be made to Docker Hub, AWS ECR, and other public/private registries.
1. Adhere to [Docker security best practices](https://docs.docker.com/engine/security/).
1. Use sensible defaults to make it easy for users to get started.
1. Utilize ngConfig project config file to save information for successive `docker:*` command runs.
1. Support `--dry-run` and `--verbose` flags.


## Proposed CLI API

### Overview

Initialize Docker files and configuration for a default build and run environment:
```
$ ng docker:init
```

Initialize a docker-compose file for deploying to a separate environment:
```
$ ng docker:init {environment}
```

Build and push a Docker image of the Angular app to the registry:
```
$ ng docker:push
```

Deploy and run the Angular app on a Docker Machine:
```
$ ng docker:deploy [environment]
```

Display logs of a running deployment:
```
$ ng docker:logs [environment] [--services service]
```

Attach to a running service container and run a command:
```
$ ng docker:exec [environment] [--service service] [--cmd bash]
```

### Command - Initialize Default Build and Run Environment

The command `docker:init` prompts the user for configuration options and generates starter `Dockerfile`, `.dockerignore`, and `docker-compose.yml` files for building/pushing images to a registry (via `docker:push`) and running (via `docker:deploy`).

Most users will start with one local 'default' Docker Machine (Mac/Win), or a local native Docker environment on Linux, where they will perform builds and run containers for development testing. This command prepares the Angular project for working with that default environment.

Example - Init default build environment:
```bash
$ ng docker:init
> Which Docker Machine for the default "build and run" environment?
  [*] default / local
  [ ] stage
  [ ] production
> What is the name of the Angular service container? [my-ng-app]
> Which host port will the Angular service use in the default "build and run" environment? [8000]
> What is the Docker registry address? [registry.hub.docker.com]
> What is the registry image name (ie. "username/ng-app")? username/my-ng-app

Generated 'Dockerfile'
Generated '.dockerignore'
Generated 'docker-compose.yml'

Docker is ready!

You can build and push a Docker image of your application to the registry using:
  $ ng docker:push

Build and run your application using:
  $ ng docker:deploy
```

#### Options

Arg / Prompt | Default | Variable name
--- | --- | ---
Which Docker Machine for the "build and run" environment?| *(Select from `docker-machine ls` names)* | defaultMachineName
What is the name of the Angular service container? | *(`package.json` app name?)* | defaultServiceName
Which host port will the Angular service use in the "${environment}" environment? | `8000` | defaultHostPort
What is the Docker registry address? | `registry.hub.docker.com` | registryAddress
What is the registry image name? (ie. "username/ng-app") | - | imageName

The configuration values will be stored in the project's ngConfig `angular-cli.json` for use with other docker commands (ie. push), under the `default` environment. See also: [Saved State](#saved-state) section.

The Docker Machine selection should have smarts to detect if local environment has native Docker support (ie. Linux, Docker Native beta).

The `docker:init` could be issued more than once. Use the currently saved ngConfig values as defaults.

A notice will be displayed for any files that already exist. No existing files will be overwritten or modified. Users are free to edit and maintain the generated files.

If the Docker CLI tools are not found, display an error with instructions on how to install Docker Toolbox. If no Docker Machines are found, display an error with instructions for creating a machine.

Provide instructions on what the user can do after initialization completes (push).

The CLI might need to ask the user some additional details about the registry type if we cannot automate their discovery in the `docker:push` command.

Users who do not wish to push images to a registry should not be forced to. Make that clear in the prompts somehow.

Should we consider allowing users to push to different registries (similar to deploying to different environments)? The current design assumes the user would only be pushing to one (most common use case). What about separating out the registry setup into `docker:init registry [registryKey]`?

See [Command - Initialize for a Deploy Environment](#command---initialize-for-a-deploy-environment) for details about the `docker-compose.yml` file. Assume code reuse with the `docker:deploy` command for capturing prompt info and generating the compose file for a "default" environment with `isImageDeploy === false`.


#### Example - `Dockerfile` template

```Dockerfile
# Default to latest nodejs LTS version base image
FROM node:4

# Use non-root user per Docker security recommendations
RUN mkdir /ngapp && \
    groupadd -r ngapp && \
    useradd -r -g ngapp -d /ngapp -s /sbin/nologin ngapp && \
    chown -R ngapp:ngapp /ngapp

# Only install prod dependencies
ENV NODE_ENV=production

WORKDIR /ngapp
COPY *.json /ngapp/
RUN npm install --unsafe-perm=true

COPY . /ngapp
RUN chown -R ngapp:ngapp /ngapp
USER ngapp

EXPOSE 4200
CMD npm run docker-start
```

#### Example - `.dockerignore` template

```
.git
.gitignore
.env*
node_modules
docker-compose*.yml
```


### Command - Initialize for a Deploy Environment

The command `docker:init {environment}` prompts the user for configuration options and generates a starter `docker-compose.yml` file for deploying containers to a different Docker environment.

Example - Init deploy environment:
```bash
$ ng docker:init stage
> What is the name of the Angular service container? [my-ng-app]
> Which host port will the Angular service use in the "stage" environment? [9000]
> Which Docker Machine for the "stage" environment?
  [ ] default / local
  [*] stage
  [ ] production
> Deploy the Angular service from a Registry [I]mage or with a [B]uild? ([I]/b)

Generated 'docker-compose-stage.yml'
Docker is ready!

Deploy and run your application in this new environment using:
  $ ng docker:deploy stage
```

#### Options

Arg / Prompt | Default | Variable name
--- | --- | ---
`environment` | - | environment
What is the name of the Angular service container? | *(`package.json` app name?)* | serviceName
Which host port will the Angular service use in the "${environment}" environment? | `8000` | hostPort
Which Docker Machine for the "${environment}" environment?| *(Select from `docker-machine ls` names)* | machineName
Deploy the Angular service from a Registry [I]mage or with a [B]uild? | `[I]`mage | isImageDeploy

The configuration values will be stored in the project's ngConfig `angular-cli.json` for use with other docker commands (ie. deploy, logs, exec). See also: [Saved State](#saved-state) section.

The Docker Machine selection should have smarts to detect if local environment has native Docker support (ie. Linux, Docker Native beta).

Each environment will have its own `docker-compose-{environment}.yml` file. Consider allowing multiple `environment` args to be passed in. Iterate over each and prompt for associated info.

The `docker:init {environment}` command can be issued multiple times to add additional deploy environments. If an existing environment is re-initialized, it will use the currently saved ngConfig values as defaults.

A notice will be displayed for any files that already exist. No existing files will be overwritten or modified. Users are free to edit and maintain the generated files.

If the Docker CLI tools are not found, display an error with instructions on how to install Docker Toolbox. If no Docker Machines are found, display an error with instructions for creating a machine.

If `isImageDeploy === false` and the selected machine for the environment is a Docker Swarm machine, warn the user. Docker Swarm clusters cannot use the `build:` option in compose, since the resulting built image will not be distributed to other nodes. Swarm requires using the `image:` option in compose, pushing the image to a registry beforehand so that the Swarm nodes have a place to pull the image from (see [Swarm Limitations](https://docs.docker.com/compose/swarm/#building-images)). Consider reordering the prompts and filtering the Swarm machines from the list of machine options if `isImageDeploy === false`.

Allow the `hostPort` to be "random", and not specified as a static port. Use input values such as "0", "?" or "random" to designate this.

Provide instructions on what the user can do after initialization completes (deploy).

#### Example - `docker-compose-${environment}.yml` template (deploy image)

When `isImageDeploy === true`, generate a compose file with the image registry path:
```yaml
version: "2"
services:
  ${serviceName}:
    image: ${registryAddress}/${imageName}:${NG_APP_IMAGE_TAG}
    ports:
      # TODO: Need some tweaks here to support random ports
      - "${hostPort}:4200"
    networks:
      - front

networks:
  front:
    driver: overlay
```

The `${NG_APP_IMAGE_TAG}` is a Compose variable, not an Angilar CLI var. It will be substituted during a `docker:deploy` command with an environment variable of the desired tag. (See [Compose Variable Substitution](https://docs.docker.com/compose/compose-file/#variable-substitution) for more info)

The `docker-compose-{environment}.yml` files are used to deploy to separate [environments](https://docs.docker.com/compose/extends/#example-use-case) with the `docker:deploy` command.

#### Example - `docker-compose-${environment}.yml` template (build and deploy)

For use cases where the user does not want to deploy a published image, but to have the docker machine build and run the image (when `isImageDeploy === false`):
```yaml
version: "2"
services:
  ${serviceName}:
    build: .
    image: ${imageName}
    ports:
      # TODO: Need some tweaks here to support random ports
      - "${hostPort}:4200"
```


### Command - Push Docker Image to Registry

The command `docker:push` builds a Docker image of the Angular app from the `Dockerfile`, and pushes the image with a new tag to the configured registry address.

The default "docker:init" build environment is always used for builds and pushes.

Example - Build and push (with auth):
```bash
$ ng docker:push
> What image tag to use? [1.0.0]
> Also tag "latest"? ([y]/n)
Building image...
Docker image built! bc2043fdd1e8

Pushing to registry...
> Enter your registry credentials
Username (username):
Password:

Push complete!
username/my-ng-app:1.0.0
username/my-ng-app:latest
```

#### Options

Arg / Prompt | Default | Variable name
--- | --- | ---
`--no-cache` | false | buildNoCache
`--force-rm` | false | forceRemove
`--pull` | false | alwaysPull
What image tag to use? | *(`package.json` app version?)* | imageTag
Also tag "latest"? | true | tagLatest
Enter your registry credentials | *(proxy to login command)* | -

The `--no-cache`, `--force-rm`, and `--pull` are [compose build options](https://docs.docker.com/compose/reference/build/).

Try an initial push. If an authentication failure occurs, attempt to login via `docker login`, or with `aws ecr get-login` if the registry address matches `/\.dkr\.ecr\./`.

The `imageTag` is saved within the ngConfig `angular-cli.json` for convenience when deploying with the `docker:deploy environment` command. Possibly save the last 5 tags, for selection by the user.

#### Internal Steps

1. Look up docker machine name from environment
1. `docker-machine env {machineName}` (if remote)
1. Rebuild app for production
1. `docker-compose build {serviceName}`
1. `docker tag {imageName} {registryAddress}:{imageName}:{imageTag}`
1. `docker push {registryAddress}:{imageName}:{imageTag}`
1. tagLatest === true?
   1. `docker tag {imageName} {registryAddress}:{imageName}:latest`
   1. `docker push {registryAddress}:{imageName}:latest`


### Command - Deploy Docker Container(s)

The command `docker:deploy` will deploy an environment's compose configuration to a Docker Machine. It starts the containers in the background and leaves them running. Successive deploys should only restart the updated services and not affect other existing running services.

Consider a command alias: `docker:run`.

Example - Default environment deploy:
```bash
$ ng docker:deploy
Building...
Deploying to default environment...
Deploy complete!
To view logs, run:
  $ ng docker:logs
```

Example - Deploying to a named environment:
```bash
$ ng docker:deploy stage
> What image tag to deploy? [1.0.0]
Deploying to stage environment...
Deploy complete!
To view logs, run:
  $ ng docker:logs stage
```

#### Options

Arg / Prompt | Default | Variable name
--- | --- | ---
`environment` | `default` | deployEnv
`--services` | *all* | deployServices[]
`--no-cache` | false | buildNoCache
`--force-rm` | false | forceRemove
`--pull` | false | alwaysPull
`--force-recreate` | false | forceRecreate
`--no-recreate` | false | noRecreate
What image tag to deploy? | *(last `dockerImageTag`)* | deployTag

The `--services` option allows for specific services to be deployed. By default, all services within the corresponding compose file will be deployed.

The `--no-cache`, `--force-rm`, and `--pull` are [compose build options](https://docs.docker.com/compose/reference/build/).

The `--force-recreate`, `--no-recreate` are [compose up options](https://docs.docker.com/compose/reference/up/).

> If there are existing containers for a service, and the service’s configuration or image was changed after the container’s creation, docker-compose up picks up the changes by stopping and recreating the containers (preserving mounted volumes). To prevent Compose from picking up changes, use the --no-recreate flag.

Use the `deployTag` value for the `${NG_APP_IMAGE_TAG}` environment variable substitution in the compose file.

**TODO**: It may be possible to query the various registry APIs for the last pushed tags, instead of maintaining a local history state. Investigate this.

Use the `deployEnv` to namespace the `--project-name` of the container set, for different environment deploys to the same Docker Machine. (See also: [Compose overview](https://docs.docker.com/compose/reference/overview/))

#### Internal Steps

1. Look up docker machine name from environment
1. `docker-machine env {machineName}`
1. isImageDeploy === true?
   1. `NG_APP_IMAGE_TAG={deployTag} docker-compose up -d [deployServices]`
1. isImageDeploy === false?
   1. Rebuild app for production
   1. `docker-compose build {serviceName}`
   1. `docker-compose up -d [deployServices]`


### Command - Display Container Logs

The command `docker:logs` will tail the output an environment's service logs.

Example - Log all services in the default environment:
```bash
$ ng docker:logs
ngapp_1 | npm info it worked if it ends with ok
ngapp_1 | npm info using npm@2.15.0
redis_1 | Redis initializing...
ngapp_1 | npm info using node@v4.4.2
...
```

Example - Log a specific service in a named environment:
```bash
$ ng docker:logs stage --services ngapp
ngapp_1 | npm info it worked if it ends with ok
ngapp_1 | npm info using npm@2.15.0
ngapp_1 | npm info using node@v4.4.2
...
```

#### Options

Arg / Prompt | Default | Variable Key
--- | --- | ---
`environment` | `default` | logsEnv
`--services` | *all* | logsServices[]
`--no-color` | false | logsNoColor

The `--services` option allows for specific services to be logged. By default, all services within the corresponding environment compose file will be logged. Consider an enhancement to autocomplete service names from the specified environment.

The `--no-color` option will produce monochrome output.

#### Internal Steps

1. Look up docker machine name from environment
1. docker-machine env {machineName}
1. docker-compose logs [logsServices]


### Command - Attach to Container

The command `docker:exec` will attach to a running service container and run a command, typically a shell to poke around inside the container for debugging purposes.

With no args, default behavior attaches to the Angular App Service in the default environment with `/bin/sh` as the CMD:
```bash
$ ng docker:exec
$ # sh prompt inside container
```

Example - Different environment, specifying a command:
```bash
$ ng docker:exec stage --cmd /bin/bash
ngapp@158410f9d1c7:~$ # bash prompt inside container
```

#### Options

Arg / Prompt | Default | Variable name
--- | --- | ---
`environment` | `default` | execEnv
`--service` | `${project}-${environment}_${environments[index].serviceName}_1` | execService
`--cmd` | `/bin/sh` | execCmd

The `--service` option allows attaching to a specific service. By default, it will attach to the first instance of the preconfigured Angular App service for the environment. A container hash is also allowed.

Allow the user to reconfigure the default command in the project's ngConfig settings file.

The utility value of this feature decreases for services other than the saved NG app service (compared to just using `docker exec` itself). Consider enhancements like autocomplete of service names or partial service name matching.

#### Internal Steps

1. Look up docker machine name from environment
1. docker-machine env {machineName}
1. docker exec -it {execService} {execCmd}


## Saved State

Example ngConfig model for saved docker command state (per project):
```
{
  docker: {
    imageName: 'username/ngapp',
    registryAddress: 'registry.hub.docker.com',
    environments: [{
      name: 'default',
      machineName: 'default',
      isImageDeploy: false,
      serviceName: 'ngapp'
    }, {
      name: 'stage',
      machineName: 'stage',
      isImageDeploy: true,
      serviceName: 'ngapp'
    }],
    imageTagHistory: [
      '1.0.0',
      '1.0.1-alpha',
      '1.0.1'
    ],
    defaultCmd: '/bin/sh'
  }
}
```

## Open Questions

1. Generate the new "version 2" of `docker-compose.yml` files, or default to version 1? Users are free to edit the generated files and switch versions. Enhancements in v2 that would be helpful to Angular CLI are: image names for builds, and build options.
1. Allow users to push to different registries, similar to deploying to different environments? The current design assumes the user would only be pushing to one (most common use case). Separate the registry setup into `docker:init registry [registryKey]`?
1. Angular CLI currently defaults to using a development server (package.json start script, `ng` devDependency). This Docker design assumes that images are built to run for any environment (including production). Is there a "production" server or `ng serve` options that disable live-reload that could be used? Note: using `ng serve` would require installing `ng` as a global or production dependency in the image.


## Other Enhancements

* Ability to list the configured deploy environments.
* Autocomplete environment names in `docker:deploy`, `logs`, and `exec` commands.
* Create an Angular development environment image with everything packaged inside. Users can run the container with local volume mounts, and toolset will watch/rebuild for local file changes. Only requires Docker to be installed to get started with Angular development. There are some complexities to solve for adding new package.json dependencies, and many users report issues with file watchers and docker volume mounts.
* Simplified provisioning of Docker Machines on GCE, AWS, Azure, Digital Ocean, etc. with [existing drivers](https://docs.docker.com/machine/drivers/). ie.

    ```
$ ng docker:create gce {machineName} {environment}
```
* Deployment support to other container scheduling systems: Kubernetes, Marathon/Mesos, AWS ECS and Beanstalk, Azure Service Fabric, etc.


## Appendix

### Implementation Approaches

Two internal implementation approaches to consider when interfacing with Docker from Node.js:

1. Docker Remote API via Node.js modules
1. Docker CLI tools via `child_process.exec`

#### Docker Remote API

<https://docs.docker.com/engine/reference/api/docker_remote_api/>

> The API tends to be REST. However, for some complex commands, like attach or pull, the HTTP connection is hijacked to transport stdout, stdin and stderr.

The API has been going through a high rate of change and has some awkward inconsistencies:

> Build Image: reply is chunked into JSON objects like {"stream":"data"} and {"error":"problem"} instead of multiplexing stdout and stderr like the rest of the API.

Example Image Build with `dockerode` module:

```js
var Docker = require('dockerode');
var tar = require('tar-fs');

var docker = new Docker({
    host: options.dockerHostIp,
    port: options.dockerPort || 2375,
    ca: fs.readFileSync(`${options.dockerCertPath}/ca.pem`),
    cert: fs.readFileSync(`${options.dockerCertPath}/cert.pem`),
    key: fs.readFileSync(`${options.dockerCertPath}/key.pem`)
});
var buildImagePromise = Promise.denodeify(docker.buildImage);
var tarStream = tar.pack(project.root);

buildImagePromise(tarStream, {
    t: options.imageName
}).then((output) => {
    var imageHash = output.match(/Successfully built\s+([a-f0-9]+)/m)[1];
    ui.writeLine(chalk.green(`Docker image built! ${imageHash}`));
});
```

Tradeoffs with this approach:

* Does not require Docker CLI tools to be installed.
* Requires cert files for access to remote Docker Machines.
* Programmatic interface.
* Requires more configuration on the part of Angular CLI.
* Configuration imposes a learning curve on existing Docker users.
* No Docker-Compose API support. Multi-container management features would need to be duplicated.
* Maintenance effort to keep API updated.
* Dependent upon 3rd-party Docker module support, or creating our own.

#### Execute Docker CLI Commands

This method wraps the following Docker CLI tools with `exec()` calls, formatting the command arguments and parsing their output:

* `docker-machine` : Used to initialize the `docker` client context for communication with a specific Docker Machine host, and for gathering host information (IP address).
* `docker` : The primary Docker client CLI. Good for pushing images to a registry.
* `docker-compose` : Manages multi-container deployments on a Docker Machine using a YAML format for defining container options. Can also be used to build images.

Example image build with `docker-machine` and `docker-compose` CLI commands:

```js
var execPromise = Promise.denodeify(require('child_process').exec);

function getDockerEnv(machineName) {
    return execPromise(`docker-machine env ${machineName}`)
        .then((stdout) => {
            let dockerEnv = {};
            stdout.split(/\r?\n/)
                .forEach((line) => {
                    let m = line.match(/^export\s+(.+?)="(.*?)"$/);
                    if (m) dockerEnv[m[1]] = m[2];
                });
            return dockerEnv;
        });
}

function buildImage() {
    return getDockerEnv(options.buildMachineName)
        .then((dockerEnv) => {
            let execOptions = {
                cwd: project.root,
                env: dockerEnv
            };
            return execPromise(`docker-compose build ${options.dockerServiceName}`, execOptions);
        })
        .then((stdout) => {
            var imageHash = stdout.match(/Successfully built\s+([a-f0-9]+)/m)[1];
            ui.writeLine(chalk.green(`Docker image built! ${imageHash}`));
            return imageHash
        });
}
```

Tradeoffs with this approach:

* Requires user to manually install Docker CLI tools
* Must build interface around CLI commands, formatting the command arguments and parsing the output.
* Can leverage Docker-Compose and its configuration format for multi-container deploys.
* Configuration of build and deploy options is simplified in Angular CLI.
* User has the flexibility of switching between `ng` commands and Docker CLI tools without having to maintain duplicate configuration.
* Lower risk of Docker compatibility issues. User has control over their Docker version.

##### Node.js Docker Modules

Module | Created | Status | Dependencies
--- | --- | --- | ---
[dockerode](https://www.npmjs.com/package/dockerode) | Sep 1, 2013 | Active | 14
[dockerizer](https://www.npmjs.com/package/dockerizer) | Feb 1, 2016 | New | 125
[docker.io](https://www.npmjs.com/package/docker.io) | Jun 1, 2013 | Outdated | ?

[List of Docker client libraries](https://docs.docker.com/engine/reference/api/remote_api_client_libraries/)

#### Summary

The "2. Docker CLI tools via `child_process.exec`" method is recommended based on the following:

* The requirement of having the Docker CLI tools installed is not generally a problem, and they would likely already be installed by the majority of users using these features.
* Maintenance to Angular CLI would likely be easier using the Docker CLI, having less configuration, documentation, and updates than the Remote API method.
* Multi-container deploys is a common use-case. Utilizing the Docker Compose features, format, and documentation is a big win.
* Since this project is a CLI itself, using the Docker CLI tools isn't too far a leap.
* Users who do not use these features are not forced to install Docker CLI. Conversely, the Remote API method might incur a small penalty of installing unused NPM modules (ie. `dockerode`).


### Container Deployment APIs in the Wild

* [Docker Run](https://docs.docker.com/engine/reference/run/)
* [Docker-Compose File](https://docs.docker.com/compose/compose-file/)
* [Kubernetes Pod](http://kubernetes.io/docs/api-reference/v1/definitions/#_v1_pod)
* [Marathon App](https://mesosphere.github.io/marathon/docs/rest-api.html#post-v2-apps)
* [Tutum Container](https://docs.tutum.co/v2/api/#container)
* [AWS Elastic Beanstalk/ECS Task Definition](http://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_defintions.html)
* [Azure Service Fabric App](https://azure.microsoft.com/en-us/documentation/articles/service-fabric-deploy-remove-applications/)
* [Heroku Docker CLI](https://github.com/heroku/heroku-docker)
* [Redspread](https://github.com/redspread/spread)
* [Docker Universal Control Plane](https://www.docker.com/products/docker-universal-control-plane)
* [Puppet Docker Module](https://github.com/garethr/garethr-docker)
* [Chef Docker Cookbook](https://supermarket.chef.io/cookbooks/docker)
* [Ansible Docker Module](http://docs.ansible.com/ansible/docker_module.html)
* [Bamboo Docker Tasks](https://confluence.atlassian.com/bamboo/configuring-the-docker-task-in-bamboo-720411254.html)
* [Freight Forwarder Manifest](http://freight-forwarder.readthedocs.org/en/latest/config/overview.html)
* [Gulp Docker Tasks](https://www.npmjs.com/package/gulp-docker)
* [Grunt Dock Tasks](https://www.npmjs.com/package/grunt-dock)
* [Robo Docker Tasks](http://robo.li/tasks/Docker/)

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
1. User is free to use the Angular CLI without Docker (and vice versa). By default, do not generate Docker files upon creation of a new project (`ng new`).
1. Don't recreate the wheel. Docker CLI tools are very full featured on their own. Implement the common Docker use cases that make it convenient for Angular applications.
1. Don't inhibit users from using the standalone Docker CLI tools for other use cases.
1. Assumes 1:1 Dockerfile with the Angular project. Support for multiple services under the same project is outside the scope of this initial design.
1. Generated starter Dockerfile will use an Nginx base image for the default server. The built ng app and Nginx configuration for HTML5 Fallback will be copied into the image.
1. User is free to modify and customize all generated files directly without involvement by the Angular CLI.
1. Image builds will support all Docker build options.
1. Container deploys will support all Docker run options.
1. Deploying to a Docker Machine can be local or remote.
1. Deploys can be made to different environments (dev, stage, prod) on the same or different Docker Machines.
1. Image pushes can be made to Docker Hub, AWS ECR, and other public/private registries.
1. Adhere to [Docker security best practices](https://docs.docker.com/engine/security/).
1. Use sensible defaults to make it easy for users to get started.
1. Support `--dry-run` and `--verbose` flags.


## Proposed CLI API

### Overview

Initialize the project for Docker builds and deploys:
```
$ ng docker init [--environment env]
```

Build and push a Docker image of the Angular app to the registry:
```
$ ng docker push [--registry url]
```

Deploy and run the Angular app on a Docker Machine:
```
$ ng docker deploy [--environment env]
```

### Command - Docker Init

The command `ng docker init` generates starter `Dockerfile`, `.dockerignore`, and `docker-compose.yml` files for builds and and deploys.

Most users will start with one local 'default' Docker Machine (Mac/Win), or a local native Docker environment on Linux, where they will perform builds and run containers for development testing. Without additional arguments, this command prepares the Angular project for working with that default environment.

**Arguments:**

* `--environment {env}` ; initialize for a particular environment (ie. dev, stage, prod). Defaults to `"default"`.
* `--machine {machineName}` ; choose a particular Docker Machine for this environment. Defaults to the environment name.
* `--service-name {serviceName}` ; the name for the webservice that serves the angular application. Defaults to `project.name`
* `--service-port {servicePort}` ; the service port that should be mapped on the host. Defaults to `8000`.
* `--use-image` ; initializes the environment for deploying with an image, rather than performing a build. By default, this is `false` and the `docker-compose.yml` file will be initialized for builds.
* `--image-org {orgName}` ; the org name to use for image pushes. Defaults to `null`.
* `--image-name {imageName}` ; the image name to use for image pushes. Also applies when `--use-image` is `true`. Defaults to `serviceName`.
* `--image-registry {address}` ; the registry address to use for image pushes. Defaults to `registry.hub.docker.com`. Also applies when `--use-image` is `true`.

**Example - Init default environment:**

```bash
$ ng docker:init --image-org my-username

Generated 'Dockerfile'
Generated '.dockerignore'
Generated 'docker-compose.yml'

Docker is ready!

You can build and push a Docker image of your application to a docker registry using:
  $ ng docker push

Build and run your application using:
  $ ng docker deploy
```

**Other requirements:**

If the Docker CLI tools are not found, display an error with instructions on how to install Docker Toolbox. If no Docker Machines are found, display an error with instructions for creating a machine.

The command should verify that the `machineName` is valid, and be able to distinguish whether it is a remote machine or a native local Docker environment (ie. Linux, Docker Native beta).

A notice will be displayed for any files that already exist. No existing files will be overwritten or modified. Users are free to edit and maintain the generated files.

If an `env` name is provided, other than "default", generate compose files with the env name appended, ie. `docker-compose-${env}.yml`.

If `--use-image == false` and the selected machine for the environment is a Docker Swarm machine, warn the user. Docker Swarm clusters cannot use the `build:` option in compose, since the resulting built image will not be distributed to other nodes. Swarm requires using the `image:` option in compose, pushing the image to a registry beforehand so that the Swarm nodes have a place to pull the image from (see [Swarm Limitations](https://docs.docker.com/compose/swarm/#building-images)).

Certain configuration values will be stored in the project's ngConfig `.angular-cli.json` for use with other docker commands (ie. deploy, logs, exec). See also: [Saved State](#saved-state) section.

Provide instructions on what the user can do after initialization completes (push, deploy).

Users who do not wish to push images to a registry should not be forced to.

#### Example - `Dockerfile` blueprint

```Dockerfile
# You are free to change the contents of this file
FROM nginx

# Configure for angular fallback routes
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built app to wwwroot
COPY dist /usr/share/nginx/html
```

#### Example - `.dockerignore` blueprint

```
.git
.gitignore
.env*
node_modules
docker-compose*.yml
```

#### Example - `docker-compose.yml` blueprint

For default case, when `--use-image == false`:

```yaml
version: "2"
services:
  ${serviceName}:
    build: .
    image: ${imageName}
    ports:
      - "${servicePort}:80"
```

When `--use-image == true`:

```yaml
version: "2"
services:
  ${serviceName}:
    image: \${NG_APP_IMAGE}
    ports:
      - "${servicePort}:80"
```

The `\${NG_APP_IMAGE}` is a Compose variable, not an Angilar CLI var. It will be substituted during a `docker deploy` command with an environment variable of the desired tag. (See [Compose Variable Substitution](https://docs.docker.com/compose/compose-file/#variable-substitution) for more info)

Separate `docker-compose-{environment}.yml` files are used to deploy to different [environments](https://docs.docker.com/compose/extends/#example-use-case), for use with the `ng docker deploy` command.


### Command - Docker Push

The command `ng docker push` builds a Docker image of the Angular app from the `Dockerfile`, and pushes the image with a new tag to a registry address.

Example - Build and push (with auth):
```bash
$ ng docker push --tag 1.0.0 --tag-latest
Building image...
Tagging "1.0.0"...
Tagging "latest"
Docker image built! bc2043fdd1e8

Pushing to registry...
> Enter your registry credentials
Username (username):
Password:

Push complete!
my-username/my-ng-app:1.0.0
my-username/my-ng-app:latest
```

#### Arguments

* `--machine {machineName}` ; the Docker Machine to use for the build. Defaults to the "default" environment's `machineName`.
* `--image-org {orgName}` ; the org name to use for image pushes. Defaults to `null`.
* `--image-name {imageName}` ; the image name to use for image pushes. Defaults to `serviceName`.
* `--image-registry {address}` ; the registry address to use for image pushes. Defaults to `registry.hub.docker.com`.
* `--tag {tag}` ; the tag for the newly built image. Defaults to the current `package.json` "version" property value.
* `--tag-latest` ; optionally and additionally apply the "latest" tag. Defaults to `false`.
* `--no-cache` ; do not use cache when building the image. Defaults to `false`.
* `--force-rm` ; always remove intermediate containers. Defaults to `false`.
* `--pull` ; always attempt to pull a newer version of the image. Defaults to `false`.

The `--no-cache`, `--force-rm`, and `--pull` are [compose build options](https://docs.docker.com/compose/reference/build/).

Try an initial push. If an authentication failure occurs, attempt to login via `docker login`, or with `aws ecr get-login` (if the registry address matches `/\.dkr\.ecr\./`). Proxy the CLI input to the login commands. Avoid storing any authentication values in ngConfig.

The `serviceName`, `registryAddress`, `orgName`, and `imageName` defaults will first be retrieved from ngConfig, which were saved during the initial `ng docker init` command. If any of these values do not exist, warn the user with instructions to add via `ng docker init` or `ng set name=value`.

#### Internal Steps

1. `docker-machine env {machineName}` (if remote)
1. Rebuild app for production
1. `docker-compose build {serviceName}`
1. `docker tag {imageName} {registryAddress}:{orgName}/{imageName}:{imageTag}`
1. `docker push {registryAddress}:{orgName}/{imageName}:{imageTag}`
1. `tag-latest == true` ?
   1. `docker tag {imageName} {registryAddress}:{orgName}/{imageName}:latest`
   1. `docker push {registryAddress}:{orgName}/{imageName}:latest`


### Command - Docker Deploy

The command `ng docker deploy` will deploy an environment's compose configuration to a Docker Machine. It starts the containers in the background and leaves them running.

Consider a command alias: `ng docker run`.

Example - Default environment deploy:
```bash
$ ng docker deploy
Building...
Deploying to default environment...
Deploy complete!
```

Example - Deploying to a named environment, without builds:
```bash
$ ng docker:deploy --environment stage
$ ng docker:deploy --environment prod --tag 1.0.1
```

Example - Deploying a specific service from the compose file:
```bash
$ ng docker deploy --services my-ng-app
```

#### Options

* `--environment {env}` ;
* `--tag {tag}` ; The tag to use whe deploying to non-build Docker Machine environments; Defaults to `package.json` "version" property value.
* `--services {svc1} {svc2} ... {svcN}` ;
* `--no-cache` ; do not use cache when building the image. Defaults to `false`.
* `--force-rm` ; always remove intermediate containers. Defaults to `false`.
* `--pull` ; always attempt to pull a newer version of the image. Defaults to `false`.
* `--force-recreate` ; recreate containers even if their configuration and image haven't changed. Defaults to `false`.
* `--no-recreate` ; if containers already exist, don't recreate them. Defaults to `false`.

The `--services` option allows for specific services to be deployed. By default, all services within the corresponding compose file will be deployed.

The `--no-cache`, `--force-rm`, and `--pull` are [compose build options](https://docs.docker.com/compose/reference/build/).

The `--force-recreate`, `--no-recreate` are [compose up options](https://docs.docker.com/compose/reference/up/).

Successive deploys should only restart the updated services and not affect other existing running services.

> If there are existing containers for a service, and the service’s configuration or image was changed after the container’s creation, docker-compose up picks up the changes by stopping and recreating the containers (preserving mounted volumes). To prevent Compose from picking up changes, use the --no-recreate flag.

Use the `tag` value for the `${NG_APP_IMAGE_TAG}` environment variable substitution in the compose file.

Use the `env` value to namespace the `--project-name` of the container set, for use with docker-compose when using different environment deploys on the same Docker Machine. (See also: [Compose overview](https://docs.docker.com/compose/reference/overview/))

#### Internal Steps

1. `docker-machine env {machineName}` (if remote)
1. `--use-image == true` ?
   1. `export NG_APP_IMAGE={registryAddress}:{orgName}/{imageName}:{tag}`
   1. `docker-compose up -d [services]`
1. `--use-image == false` ?
   1. Rebuild app for production
   1. `docker-compose build {serviceName}`
   1. `docker-compose up -d [services]`


## Saved State

Example ngConfig model for saved docker command state (per project):
```
{
  docker: {
    orgName: 'myusername',
    imageName: 'ngapp',
    registryAddress: 'registry.hub.docker.com',
    environments: {
      default: {
        machineName: 'default',
        isImageDeploy: false,
        serviceName: 'ngapp'
      },
      stage: {
        machineName: 'stage',
        isImageDeploy: true,
        serviceName: 'ngapp'
      }
    }
  }
}
```


## Other Enhancements

* Ability to list the configured deploy environments.
* Autocomplete environment names for `ng docker deploy`.
* New command wrappers for `docker-compose logs`, and `docker exec` commands.
* Create an Angular development environment image with everything packaged inside. Users can run the container with local volume mounts, and toolset will watch/rebuild for local file changes. Only requires Docker to be installed to get started with Angular development. There are some Node.js complexities to solve when adding new package.json dependencies, and many users report issues with file watchers and docker volume mounts.
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
* [Kubernetes Pod](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.10/)
* [Marathon App](https://mesosphere.github.io/marathon/docs/rest-api.html#post-v2-apps)
* [Tutum Container](https://docs.tutum.co/v2/api/#container)
* [AWS Elastic Beanstalk/ECS Task Definition](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html)
* [Azure Service Fabric App](https://docs.microsoft.com/en-us/azure/service-fabric/service-fabric-deploy-remove-applications)
* [Heroku Docker CLI](https://github.com/heroku/heroku-container-tools)
* [Redspread](https://github.com/redspread/spread)
* [Docker Universal Control Plane](https://www.docker.com/products/docker-universal-control-plane)
* [Puppet Docker Module](https://github.com/garethr/garethr-docker)
* [Chef Docker Cookbook](https://supermarket.chef.io/cookbooks/docker)
* [Ansible Docker Module](https://docs.ansible.com/ansible/latest/modules/docker_module.html)
* [Bamboo Docker Tasks](https://confluence.atlassian.com/bamboo/configuring-the-docker-task-in-bamboo-720411254.html)
* [Freight Forwarder Manifest](http://freight-forwarder.readthedocs.io/en/latest/config/overview.html)
* [Gulp Docker Tasks](https://www.npmjs.com/package/gulp-docker)
* [Grunt Dock Tasks](https://www.npmjs.com/package/grunt-dock)
* [Robo Docker Tasks](https://robo.li/tasks/Docker/)

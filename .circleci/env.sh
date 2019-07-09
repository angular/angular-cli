#!/usr/bin/env bash

# Variables
readonly projectDir=$(realpath "$(dirname ${BASH_SOURCE[0]})/..")
readonly envHelpersPath="$projectDir/.circleci/env-helpers.inc.sh";

# Load helpers and make them available everywhere (through `$BASH_ENV`).
source $envHelpersPath;
echo "source $envHelpersPath;" >> $BASH_ENV;


####################################################################################################
# Define PUBLIC environment variables for CircleCI.
####################################################################################################
# See https://circleci.com/docs/2.0/env-vars/#built-in-environment-variables for more info.
####################################################################################################
setPublicVar PROJECT_ROOT "$projectDir";

####################################################################################################
# Define SauceLabs environment variables for CircleCI.
####################################################################################################
setPublicVar SAUCE_USERNAME "angular-ci";
setSecretVar SAUCE_ACCESS_KEY "9b988f434ff8-fbca-8aa4-4ae3-35442987";
setPublicVar SAUCE_LOG_FILE /tmp/angular/sauce-connect.log
setPublicVar SAUCE_READY_FILE /tmp/angular/sauce-connect-ready-file.lock
setPublicVar SAUCE_PID_FILE /tmp/angular/sauce-connect-pid-file.lock
setPublicVar SAUCE_TUNNEL_IDENTIFIER "angular-${CIRCLE_BUILD_NUM}-${CIRCLE_NODE_INDEX}"
# Amount of seconds we wait for sauceconnect to establish a tunnel instance. In order to not
# acquire CircleCI instances for too long if sauceconnect failed, we need a connect timeout.
setPublicVar SAUCE_READY_FILE_TIMEOUT 120

# Source `$BASH_ENV` to make the variables available immediately.
source $BASH_ENV;

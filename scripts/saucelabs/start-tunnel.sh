#!/usr/bin/env bash

set -x -u -e -o pipefail

readonly currentDir=$(cd $(dirname $0); pwd)
readonly connectVersion="sc-4.9.2-linux"
readonly connectHash="2f8a3f87e1da4dc9a41bc45ec7c3a2ecdba4c72d72b7d0193f04ad66c5809104"

echo "Downloading Sauce Connect"

curl https://saucelabs.com/downloads/${connectVersion}.tar.gz -o ${currentDir}/${connectVersion}.tar.gz
echo "${connectHash}  ${currentDir}/${connectVersion}.tar.gz" | shasum -a 256 -c
tar -xzf ${currentDir}/${connectVersion}.tar.gz -C ${currentDir}

# Command arguments that will be passed to sauce-connect. By default we disable SSL bumping for
# all requests. This is because SSL bumping is not needed for our test setup and in order
# to perform the SSL bumping, Saucelabs intercepts all HTTP requests in the tunnel VM and modifies
# them. This can cause flakiness as it makes all requests dependent on the SSL bumping middleware.
# See: https://wiki.saucelabs.com/display/DOCS/Troubleshooting+Sauce+Connect#TroubleshootingSauceConnect-DisablingSSLBumping
sauceArgs="--no-ssl-bump-domains all"

if [[ ! -z "${SAUCE_LOG_FILE:-}" ]]; then
  mkdir -p $(dirname ${SAUCE_LOG_FILE})
  sauceArgs="${sauceArgs} --logfile ${SAUCE_LOG_FILE}"
fi

if [[ ! -z "${SAUCE_READY_FILE:-}" ]]; then
  mkdir -p $(dirname ${SAUCE_READY_FILE})
  sauceArgs="${sauceArgs} --readyfile ${SAUCE_READY_FILE}"
fi

if [[ ! -z "${SAUCE_PID_FILE:-}" ]]; then
  mkdir -p $(dirname ${SAUCE_PID_FILE})
  sauceArgs="${sauceArgs} --pidfile ${SAUCE_PID_FILE}"
fi


echo "Starting Sauce Connect. Passed arguments: ${sauceArgs}"

${currentDir}/${connectVersion}/bin/sc -u ${SAUCE_USERNAME} -k ${SAUCE_ACCESS_KEY} ${sauceArgs}

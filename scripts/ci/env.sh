#!/bin/bash

if [[ -z "${TRAVIS}" ]]; then
  echo "This script can only setup the environment inside of Travis builds"
  exit 0
fi

# - we overwrite the value set by Travis JWT addon here to work around travis-ci/travis-ci#7223 for FIREBASE_ACCESS_TOKEN
export SAUCE_ACCESS_KEY=9b988f434ff8-fbca-8aa4-4ae3-35442987

#!/usr/bin/env bash
source ./scripts/ci/sources/tunnel.sh

is_lint() {
  [[ "${MODE}" = lint ]]
}

is_build() {
  [[ "${MODE}" = build ]]
}

is_jasmine() {
  [[ "${MODE}" = jasmine ]]
}

is_karma() {
  [[ "${MODE}" = karma ]]
}

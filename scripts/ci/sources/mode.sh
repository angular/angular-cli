#!/usr/bin/env bash

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

@ECHO OFF
IF not defined APPVEYOR_PULL_REQUEST_NUMBER (
  IF not defined BUILDKITE_PULL_REQUEST (
    REM Run full test suite if not on a Appveyor/Buildkite PR.
    node tests\legacy-cli\run_e2e.js --appveyor "--glob=tests/{basic,commands,generate,build/styles,ivy}/**"
    exit
  )
) 

REM Run partial test suite.
node tests\legacy-cli\run_e2e.js --appveyor "--glob=tests/{basic,ivy}/**"


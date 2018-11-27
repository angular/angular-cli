@ECHO OFF
IF defined APPVEYOR_PULL_REQUEST_NUMBER (
    node tests\legacy-cli\run_e2e.js --appveyor "--glob=tests/basic/**"
) ELSE (
    node tests\legacy-cli\run_e2e.js --appveyor "--glob=tests/{basic,commands,generate,build/styles}/**"
)
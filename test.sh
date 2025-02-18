set -e

yarn bazel build \
    --config=e2e //tests/legacy-cli:e2e_node22

yarn bazel test \
    --config=e2e //tests/legacy-cli:e2e_node22 \
    --spawn_strategy=local \
    --test_filter="tests/basic/{build,rebuild}.ts" \
    --test_arg="--esbuild" \
    --test_env="NG_E2E_RUNNER_WSL_ROOT=C:\wsl_root" \
    --test_env="NG_E2E_RUNNER_WSL_UNC_BASE=\\\\wsl.localhost\Debian" \
    --test_env="NG_E2E_RUNNER_WINDOWS_CMD=/mnt/c/Windows/system32/cmd.exe" \
    --test_env="NG_E2E_RUNNER_WINDOWS_NPM=C:\Program Files\nodejs\npm" \
    --test_env="NG_E2E_RUNNER_WINDOWS_TMP_DIR=/mnt/c/Users/paulg/AppData/Local/Temp" \
    --test_env="NG_E2E_RUNNER_WINDOWS_GIT_BASH_BIN=/mnt/c/Program Files/Git/bin/git" \
    --test_output=streamed \
    --flaky_test_attempts=1
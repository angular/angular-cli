set -e

yarn bazel test \
    --define=E2E_SHARD_TOTAL=6 --define=E2E_SHARD_INDEX=2 \
    --//tests/legacy-cli:enable_native_windows_testing=true \
    --config=e2e //tests/legacy-cli:e2e.esbuild_node22 \
    --test_arg="--esbuild" \
    --test_env="NG_E2E_RUNNER_WSL_ROOT=C:\wsl_root" \
    --test_env="NG_E2E_RUNNER_WSL_UNC_BASE=\\\\wsl.localhost\Debian" \
    --test_env="NG_E2E_RUNNER_WINDOWS_CMD=/mnt/c/Windows/system32/cmd.exe" \
    --test_env="NG_E2E_RUNNER_WINDOWS_NPM=C:\Program Files\nodejs\npm" \
    --test_env="NG_E2E_RUNNER_WINDOWS_TMP_DIR=/mnt/c/Users/paulg/AppData/Local/Temp" \
    --test_env="NG_E2E_RUNNER_WINDOWS_GIT_BASH_BIN=/mnt/c/Program Files/Git/bin/git" \
    --test_env="NG_E2E_RUNNER_WSL_HOST_ADDR=$(ip route show | grep -i default | awk '{ print $3}')" \
    --test_env="NG_E2E_RUNNER_WSL_VM_ADDR=$(hostname -I)" \
    --test_output=streamed \
    --flaky_test_attempts=1 \
    --strategy=TestRunner=standalone
# no shebang as it expects to be run in the current shell, not standalone
if [[ $TRAVIS_OS_NAME == "osx" ]]; then
    # Recommended by travis guys to always brew update first
    brew update
    # Install NVM
    brew install nvm
    # Use -p just in case the folder already exists
    mkdir -p ~/.nvm
    # Make sure the NVM_DIR is set before sourcing nvm.sh
    export NVM_DIR=~/.nvm && source $(brew --prefix nvm)/nvm.sh
    nvm alias default $NODE_VERSION
fi
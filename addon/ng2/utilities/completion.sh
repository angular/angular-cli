###-begin-ng-completion### 
#
# ng command completion script
#
# Installation: ng completion >> ~/.bashrc (or ~/.zshrc)
#

ng_opts='new init build serve generate autocomplete e2e lint test version'
init_opts='--dry-run --verbose --blueprint --skip-npm --skip-bower --name'
new_opts='--dry-run --verbose --blueprint --skip-npm --skip-bower --skip-git --directory'
build_opts='--environment --output-path --watch --watcher'
serve_opts='--port --host --proxy --insecure-proxy --watcher --live-reload --live-reload-host
            --live-reload-port --environment --output-path --ssl --ssl-key --ssl-cert'
generate_opts='component directive pipe route service'
test_opts='--watch --browsers --colors --log-level --port --reporters'

if type complete &>/dev/null; then
  _ng_completion() {
    local cword pword opts

    COMPREPLY=()
    cword=${COMP_WORDS[COMP_CWORD]}
    pword=${COMP_WORDS[COMP_CWORD - 1]}

    case ${pword} in
      ng) opts=$ng_opts ;;
      i|init) opts=$init_opts ;;
      new) opts=$new_opts ;;
      b|build) opts=$build_opts ;;
      s|serve|server) opts=$serve_opts ;;
      g|generate) opts=$generate_opts ;;
      test) opts=$test_opts ;;
    esac

    COMPREPLY=( $(compgen -W '${opts}' -- $cword) )

    return 0
  }
  complete -o default -F _ng_completion ng
elif type compctl &>/dev/null; then
  _ng_completion () {
    local words cword opts
    read -Ac words
    read -cn cword
    let cword-=1

    case $words[cword] in
      ng) opts=$ng_opts ;;
      i|init) opts=$init_opts ;;
      new) opts=$new_opts ;;
      b|build) opts=$build_opts ;;
      s|serve|server) opts=$serve_opts ;;
      g|generate) opts=$generate_opts ;;
      test) opts=$test_opts ;;
    esac
    
    setopt shwordsplit
    reply=($opts)
    unset shwordsplit
  }
  compctl -K _ng_completion ng
fi
###-end-ng-completion###
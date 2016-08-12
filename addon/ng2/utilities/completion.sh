###-begin-ng-completion###
#
# ng command completion script
#
# Installation: ng completion >> ~/.bashrc (or ~/.zshrc)
#

ng_opts='b build completion doc e2e g generate get github-pages:deploy gh-pages:deploy h help i init install lint make-this-awesome new s serve server set t test v version -h --help'

build_opts='--environment --output-path --suppress-sizes --target --watch --watcher -dev -e -prod'
generate_opts='class component directive enum module pipe route service --generate -d --dry-run --verbose -v --pod -p --classic -c --dummy -dum -id --in-repo --in-repo-addon -ir'
github_pages_deploy_opts='--environment --gh-token --gh-username --skip-build --user-page --message'
help_opts='--json --verbose -v'
init_opts='--blueprint --dry-run --link-cli --mobile --name --prefix --skip-bower --skip-npm --source-dir --style --verbose -b -d -lc -n -p -sb -sd -sn -v'
new_opts='--blueprint --directory --dry-run --link-cli --mobile --prefix --skip-bower --skip-git --skip-npm --source-dir --style --verbose -b -d -dir -lc -p -sb -sd -sg -sn -v'
serve_opts='--environment --host --insecure-proxy --inspr --live-reload --live-reload-base-url --live-reload-host --live-reload-live-css --live-reload-port --output-path --port --proxy --ssl --ssl-cert --ssl-key --target --watcher -H -dev -e -lr -lrbu -lrh -lrp -op -out -p -pr -prod -pxy -t -w'
set_opts='--global -g'
test_opts='--browsers --colors --config-file --environment --filter --host --launch --log-level --module --path --port --query --reporter --server --silent --test-page --test-port --watch -H -c -cf -e -f -m -r -s -tp -w'
version_opts='--verbose'

if type complete &>/dev/null; then
  _ng_completion() {
    local cword pword opts

    COMPREPLY=()
    cword=${COMP_WORDS[COMP_CWORD]}
    pword=${COMP_WORDS[COMP_CWORD - 1]}

    case ${pword} in
      ng) opts=$ng_opts ;;
      b|build) opts=$build_opts ;;
      g|generate) opts=$generate_opts ;;
      h|help|-h|--help) opts=$help_opts ;;
      init) opts=$init_opts ;;
      new) opts=$new_opts ;;
      s|serve|server) opts=$serve_opts ;;
      set) opts=$set_opts ;;
      t|test) opts=$test_opts ;;
      v|version) opts=$version_opts ;;
      *) opts='' ;;
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
      b|build) opts=$build_opts ;;
      g|generate) opts=$generate_opts ;;
      h|help|-h|--help) opts=$help_opts ;;
      init) opts=$init_opts ;;
      new) opts=$new_opts ;;
      s|serve|server) opts=$serve_opts ;;
      set) opts=$set_opts ;;
      t|test) opts=$test_opts ;;
      v|version) opts=$version_opts ;;
      *) opts='' ;;
    esac

    setopt shwordsplit
    reply=($opts)
    unset shwordsplit
  }

  compctl -K _ng_completion ng
fi

###-end-ng-completion###
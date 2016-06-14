export interface NgAppStructure extends JSON{
  package: {
    name: string,
    blueprint?: string,
    dryRun?: boolean,
    verbose?: boolean,
    skipNpm?: boolean,
    skipGit?: boolean,
    directory?: string
  },
  routes?: {
    name: string,
    flat?: boolean,
    default?: boolean,
    lazy?: boolean,
    skipRouterGeneration?: boolean,
    route?: string
  }[],
  components?: {
    name: string,
    flat?: boolean,
    route?: string
  }[],
  pipes?: {
    name: string,
    flat?: boolean
  }[],
  services?: {
    name: string,
    flat?: boolean
  }[],
  directives?: {
    name: string,
    flat?: boolean
  }[],
  classes?: {
    name: string,
    flat?: boolean
  }[],
  enums?: {
    name: string,
    flat?: boolean
  }[]
}
load("@aspect_rules_js//js:providers.bzl", "JsInfo", "js_info")
load("@aspect_rules_ts//ts:defs.bzl", _ts_project = "ts_project")
load("@rules_nodejs//nodejs:providers.bzl", "DeclarationInfo", "JSModuleInfo", "LinkablePackageInfo")

def _ts_deps_interop_impl(ctx):
    types = []
    sources = []
    runfiles = ctx.runfiles(files = [])
    for dep in ctx.attr.deps:
        if not DeclarationInfo in dep:
            fail("Expected target with DeclarationInfo: %s", dep)
        types.append(dep[DeclarationInfo].transitive_declarations)
        if not JSModuleInfo in dep:
            fail("Expected target with JSModuleInfo: %s", dep)
        sources.append(dep[JSModuleInfo].sources)
        if not DefaultInfo in dep:
            fail("Expected target with DefaultInfo: %s", dep)
        runfiles = runfiles.merge(dep[DefaultInfo].default_runfiles)

    return [
        DefaultInfo(runfiles = runfiles),
        ## NOTE: We don't need to propagate module mappings FORTUNATELY!
        # because rules_nodejs supports tsconfig path mapping, given that
        # everything is nicely compiled from `bazel-bin/`!
        js_info(
            target = ctx.label,
            transitive_types = depset(transitive = types),
            transitive_sources = depset(transitive = sources),
        ),
    ]

ts_deps_interop = rule(
    implementation = _ts_deps_interop_impl,
    attrs = {
        "deps": attr.label_list(providers = [DeclarationInfo], mandatory = True),
    },
)

def _ts_project_module_impl(ctx):
    # Forward runfiles. e.g. JSON files on `ts_project#data`. The jasmine
    # consuming rules may rely on this, or the linker due to its symlinks then.
    runfiles = ctx.attr.dep[DefaultInfo].default_runfiles
    info = ctx.attr.dep[JsInfo]

    providers = [
        DefaultInfo(
            runfiles = runfiles,
        ),
        JSModuleInfo(
            direct_sources = info.sources,
            sources = depset(transitive = [info.transitive_sources]),
        ),
        DeclarationInfo(
            declarations = info.types,
            transitive_declarations = info.transitive_types,
            type_blocklisted_declarations = depset(),
        ),
    ]

    if ctx.attr.module_name:
        providers.append(
            LinkablePackageInfo(
                package_name = ctx.attr.module_name,
                package_path = "",
                path = "%s/%s/%s" % (ctx.bin_dir.path, ctx.label.workspace_root, ctx.label.package),
                files = info.sources,
            ),
        )

    return providers

ts_project_module = rule(
    implementation = _ts_project_module_impl,
    attrs = {
        "dep": attr.label(providers = [JsInfo], mandatory = True),
        # Noop attribute for aspect propagation of the linker interop deps; so
        # that transitive linker dependencies are discovered.
        "deps": attr.label_list(),
        # Note: The module aspect from consuming `ts_library` targets will
        # consume the module mappings automatically.
        "module_name": attr.string(),
    },
)

def ts_project(name, module_name = None, interop_deps = [], deps = [], testonly = False, **kwargs):
    ts_deps_interop(
        name = "%s_interop_deps" % name,
        deps = interop_deps,
        testonly = testonly,
    )

    _ts_project(
        name = "%s_rjs" % name,
        testonly = testonly,
        tsconfig = "//:test-tsconfig" if testonly else "//:build-tsconfig",
        declaration = True,
        deps = ["%s_interop_deps" % name] + deps,
        **kwargs
    )

    ts_project_module(
        name = name,
        testonly = testonly,
        dep = "%s_rjs" % name,
        deps = interop_deps,
        module_name = module_name,
    )

# Public Repository Policy

This repository is the public distribution package for the Enrichley MCP plugin. It contains customer-facing manifests, connection metadata, skills, assets, and public-safe documentation. It is not an operational evidence store.

## Public boundary

Allowed public information includes:

- customer installation and update instructions;
- the production MCP URL and other intentionally public Enrichley URLs;
- public tool and resource names, versions, behavior, and pricing rules;
- semantic plugin versions and public host-compatibility results;
- the registered public plugin/app identifiers required by package manifests.

Do not commit:

- credentials, access tokens, private keys, signed evidence, or account identifiers;
- infrastructure deployment identifiers, internal topology, private-service revisions, or private repository names;
- workstation paths, local checkout state, personal author metadata, or tester identities;
- reviewer-account authentication settings, recovery details, or customer data;
- workflow-run identifiers or raw logs from private operational verification;
- creator, editing-tool, document, user, or brand metadata embedded in image assets.

Detailed release and runtime evidence belongs in Enrichley's private operational records. The public release ledger records only package version, public contract, host compatibility, and a public verification outcome.

## Current distribution release

Version `0.1.9` is the additive Business Context distribution release. The public contract contains 27 tools and the bundled skill adds optional customer-owned Business Context guidance. The production endpoint, app identity, authentication flow, billing safeguards, and existing lead-search workflows remain unchanged. Fresh authenticated host verification is pending.

## Publishing identity

Releases are committed directly to `main` as `Enrichley Bot <agent@enrichley.com>`. Maintainers do not open pull requests for repository releases.

Before publishing:

1. Authenticate GitHub using the approved Enrichley Bot credential supplied outside this repository.
2. Run `scripts/check-publisher-identity.sh --push` and require it to pass without displaying any credential.
3. Run the validation commands in `docs/claude-release-runbook.md`.
4. Push directly to `main` and confirm the public `validate` workflow passes.
5. Inspect the published commit anonymously to confirm the author, files, and assets expose only intended public information.

Never place a bot token in a remote URL, shell command, repository file, workflow variable, log, or documentation example.

## Local safeguards

This repository provides versioned `pre-commit` and `pre-push` hooks under `.githooks/`. Enable them once in each approved publishing clone:

```sh
git config core.hooksPath .githooks
```

The commit hook checks the configured author, the boundary fixtures and current tree, and the public-contract fixtures and artifact. The push hook runs the same validators, additionally verifies that the active GitHub account is the approved publisher, and scans every commit and object introduced after `origin/main`, including the expected author and committer. These hooks are defense in depth; the GitHub `main` ruleset should independently restrict updates to the approved bot actor.

Public CI repeats the boundary and contract suites without credentials. Pull requests use the pull-request base and pushes use the prior public revision as the reviewed base for introduced-history validation. The explicit all-reachable-history mode validates every reachable commit and object.

## CI disclosure behavior

The public-boundary checker reports only a safe file path, stable rule identifier, and abbreviated object identifier. It never prints the matching text or suspected credential. Public workflows retain read-only repository permission, check out only this public repository, and must not receive private repository contents, production credentials, private tokens, private operational logs, or upload diagnostic artifacts.

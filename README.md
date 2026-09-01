# Enrichley MCP Plugin

Use [Enrichley](https://enrichley.io) from ChatGPT, Codex, Claude, and other AI agents: B2B **People Search**, **Company Lookalike**, **Email Finder**, and **Email Validation**, with previews, upfront credit quotes, and customer-run downloads for completed People Search and Company Lookalike results.

This repository contains no server code. It packages the connection settings and agent skills for Enrichley's hosted MCP server at `https://mcp.enrichley.io/mcp`.

## Install

### Claude Code

```
/plugin marketplace add getEnrichley/enrichley-mcp-plugin
/plugin install enrichley@enrichley
```

The plugin configures the Enrichley MCP server and loads the `using-enrichley` skill. On first tool use you sign in with your Enrichley account.

To update an existing Claude Code installation:

```sh
claude plugin marketplace update enrichley
claude plugin update enrichley@enrichley
```

Run `/reload-plugins` in Claude Code or restart it, then start a new conversation. Confirm the installed plugin version shown by `claude plugin list` is the current version in `.claude-plugin/plugin.json`.

### Claude web and mobile

Go to **Customize -> Plugins -> Add plugin -> Add marketplace -> Add from a repository**, select or enter `getEnrichley/enrichley-mcp-plugin`, then add **Enrichley**. The plugin installs the `using-enrichley` skill and its production Enrichley connector together. Connect and authenticate with your Enrichley account when prompted.

Do not keep a standalone Enrichley connector active alongside the plugin connector. Disconnect a development or standalone connector before connecting the plugin.

To update an existing Claude web, desktop, or Cowork installation, open **Customize -> Plugins**, update the Enrichley marketplace, and update or reinstall **Enrichley** if the displayed plugin version is older than the current version in this repository. Start a new conversation after the update. The plugin should contribute exactly one production Enrichley connector plus the `using-enrichley` skill.

Reload Claude after installing or updating. If a new conversation cannot see the Enrichley tools, open the composer's connector picker, turn off any inherited **Enrichley Dev** or standalone Enrichley connector, reload `/new`, and try again. Claude fixes a conversation's tool catalog when that conversation starts.

### ChatGPT

The customer installation path is the universal public Plugins Directory shared by ChatGPT and Codex:

1. Open **Plugins** in ChatGPT.
2. Search for **Enrichley**.
3. Select **Add**.
4. Select **Connect** and sign in with your Enrichley account.

That one install loads the `using-enrichley` skill and the production Enrichley connector together. Customers do not need Developer Mode, a GitHub repository, a connector URL, or an API key.

**Publication status:** Enrichley is not yet listed in the public Plugins Directory. Until OpenAI approves and Enrichley publishes the listing, the steps above are unavailable to external customers. Adding the MCP server in ChatGPT Developer Mode creates a connector-only test integration; it does not install this plugin bundle.

### ChatGPT and Codex maintainer testing

The repository includes the universal OpenAI plugin manifest used by ChatGPT and Codex. Before public publication, maintainers can add this repository as a marketplace for local testing:

```sh
codex plugin marketplace add getEnrichley/enrichley-mcp-plugin --ref main
codex plugin add enrichley@enrichley
```

Restart the ChatGPT desktop app after adding the marketplace, then install **Enrichley** from that marketplace and start a new ChatGPT or Codex session. Repository marketplaces are an authoring and test mechanism supported by Codex CLI and the ChatGPT desktop app. They are not the external-customer installation path, and ChatGPT web users need the published universal-directory plugin.

OpenAI public-directory release requirements and reviewer materials are tracked in [docs/openai-directory-submission.md](docs/openai-directory-submission.md).

### Connector-only fallback

If the host supports remote MCP but not plugins, add `https://mcp.enrichley.io/mcp` as a custom connector and authenticate with your Enrichley account. This exposes the tools but does not install the `using-enrichley` skill.

### Other MCP clients

Point any MCP client that supports Streamable HTTP and OAuth at:

```
https://mcp.enrichley.io/mcp
```

## What's inside

| Path | Purpose |
| --- | --- |
| `.claude-plugin/plugin.json` | Claude Code plugin manifest |
| `.claude-plugin/marketplace.json` | Claude marketplace listing |
| `.agents/plugins/marketplace.json` | ChatGPT and Codex repository marketplace listing |
| `.codex-plugin/plugin.json` | Universal ChatGPT and Codex plugin manifest |
| `.app.json` | Maps the universal plugin to Enrichley's registered production MCP app |
| `.mcp.json` | MCP server connection bundled by the plugin |
| `assets/` | OpenAI public-directory logo and composer icon |
| `server.json` | MCP registry manifest |
| `skills/using-enrichley/` | Agent skill: the preview, quote, run, and download workflow |
| `docs/release-ledger.md` | Public plugin release and compatibility record |
| `docs/claude-release-runbook.md` | Maintainer release, update, install, and Claude verification procedure |
| `docs/public-repository-policy.md` | Public-boundary, publisher-identity, and disclosure rules |

## Release discipline

Every customer-visible plugin payload change requires a new semantic version. This includes changes under `skills/`, either host manifest, the MCP or app mapping, and plugin assets. CI compares those paths with the branch base and fails when their content changes without an increased plugin version. The [public release ledger](docs/release-ledger.md) contains only public package and compatibility facts; detailed operational evidence stays outside this public repository.

Version `0.1.8` is the current distribution-integrity release. Public repository, contract, package, manifest, Claude, and Codex validations pass. MCP tools, schemas, behavior, endpoints, authentication, billing, customer workflows, and runtime contracts are unchanged.

Maintainers use the same public-boundary and public-contract validators locally and in public CI. Run current-tree validation while preparing a commit:

```sh
node scripts/check-public-boundary.test.mjs
node scripts/check-public-boundary.mjs
node scripts/check-public-contract.test.mjs
node scripts/check-public-contract.mjs
```

Before a push, validate every commit and object introduced after the reviewed base:

```sh
node scripts/check-public-boundary.mjs --base origin/main --history
```

The explicit `--all-history` mode validates every reachable commit and object in addition to the reviewed-range check.

## Pricing and account

Company Lookalike previews are free; People Search previews are free within your plan's monthly allowance. Paid runs consume Enrichley credits and always show a quote before anything is charged. Plans and limits: https://enrichley.io

## Support

- Documentation: https://docs.enrichley.io
- MCP setup and troubleshooting: https://docs.enrichley.io/mcp/setup

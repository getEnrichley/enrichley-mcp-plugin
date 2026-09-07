# Enrichley MCP Plugin Public Release Ledger

This ledger records only public package and compatibility facts. Infrastructure deployment identifiers, private-service source revisions, CI run identifiers, workstation state, tester identities, and account configuration belong in Enrichley's private operational records and must never be added here.

## Release rules

1. Every change to a skill, plugin manifest, connector/app mapping, or bundled asset receives a higher semantic version.
2. Claude and OpenAI manifests carry the same version even when only one host consumes the changed field.
3. Record the public package purpose, public MCP contract, supported hosts, and a public verification result.
4. Do not record credentials, user or account identifiers, infrastructure topology, private repository names, deployment identifiers, or non-public source revisions.
5. A host is marked verified only after a fresh conversation loads exactly one production Enrichley connector and the expected skill version.

## 0.1.11 — App mapping

Status: **app-mapping-only package release; fresh installed-package verification pending**.

- Updates the registered app association. The public contract remains 27 tools; no endpoint, schema, skill, billing, authentication flow, or runtime behavior changed.
- Replacement ChatGPT registration verification: both Business Context reads, Account Status, explicit People Search List Jobs, and a returned-ID metadata lookup passed. An unrelated negative prompt made no Enrichley call.
- No preview, mutation, validation, download, or paid action occurred during those registration checks.
- Registration verification is distinct from fresh installed-package verification, which remains pending until after publication.

## 0.1.10 — Job auditing and confirmation guidance

Status: **previous guidance release**.

- Correct job-metadata use, job/run identifiers, and saved-audience paging.
- Clarify confirmation-card reconciliation, terminal status, settlement, and unchanged signed evidence.
- Focus public documentation on customer installation and product behavior.
- Public contract: 27 tools. Hosts targeted: Claude, ChatGPT, and Codex.
- Local boundary, contract, version, package, and shared-skill parity checks passed. The public validation workflow passed, including its isolated Codex plugin-install check. Fresh `0.1.10` live host tests are not recorded; no fresh conversational paid-execution verification is claimed.

## 0.1.9 — Business Context distribution

Status: **released additive distribution; Claude Code and Claude web/Cowork installation/catalog verified** on 2026-09-01.

| Field | Public value |
| --- | --- |
| Plugin version | `0.1.9` |
| Package purpose | Add optional customer-owned Business Context guidance and synchronize the exact public tool contract |
| Production MCP endpoint | `https://mcp.enrichley.io/mcp` |
| Public tool contract | 27 tools; adds two read-only Business Context tools |
| Host impact | Additive skill and catalog guidance; existing lead-search behavior is unchanged |

### Public verification status

- Public repository, boundary, contract, package, and manifest checks pass locally; the public `validate` workflow passed for the `0.1.9` release commit.
- The two Business Context tools are read-only, non-destructive, and debit zero credits.
- Claude Code updated from `0.1.6` to `0.1.9`, remained enabled, connected to the production endpoint, and exposed the 27-tool catalog in a fresh session.
- Claude web/Cowork loaded a fresh `0.1.9` personal-marketplace installation with one skill, one connected production connector, and the 27-tool catalog grouped as 7 interactive, 11 read-only, and 9 write/delete tools.
- Both hosts exposed **List Business Context profiles** and **Get Business Context**. A fresh Claude conversation exposed `/using-enrichley`.
- No MCP tool, preview, quote confirmation, paid run, download, credential, or customer-data mutation was used for this package verification.

## 0.1.8 — Distribution-integrity release

Status: **superseded distribution-integrity release**. MCP tools, schemas, behavior, endpoints, authentication flows, billing rules, customer workflows, and runtime contracts were unchanged in this release.

| Field | Public value |
| --- | --- |
| Plugin version | `0.1.8` |
| Package purpose | Distribution-integrity validation for the public package |
| Production MCP endpoint | `https://mcp.enrichley.io/mcp` |
| Public tool contract | 25 tools; unchanged from `0.1.7` |
| Host impact | None; distribution validation and package version only |

### Public verification status

- Public repository, boundary, contract, package, manifest, Claude, and Codex validations pass.
- The public tool contract remains 25 tools, unchanged from `0.1.7`.
- MCP tools, schemas, behavior, endpoints, authentication flows, billing rules, customer workflows, and runtime contracts are unchanged.

## 0.1.7 — Public package safeguards

Status: **package-only release**. No MCP tool behavior, skill behavior, endpoint, authentication flow, or customer workflow changed.

| Field | Public value |
| --- | --- |
| Plugin version | `0.1.7` |
| Package purpose | Maintain public image metadata and add public-repository publishing safeguards |
| Production MCP endpoint | `https://mcp.enrichley.io/mcp` |
| Public tool contract | 25 tools; unchanged from `0.1.6` |
| Public resources | `enrichley://usage-guide`; Account Status `v1`; Preview Results `v3`; Run Quote `v10`; Download `v1` |
| Connector policy | Exactly one production connector; no simultaneous standalone or development Enrichley connector |
| Host impact | None; manifests change only by semantic version and the image pixels are unchanged |

### Public verification

- The Claude and OpenAI package validators passed locally.
- The public-boundary checker passed for tracked text and PNG assets.
- The image's encoded pixel payload is unchanged.
- No MCP, runtime, database, customer-data, or paid action was invoked for this package-only release.

## 0.1.6 — Intent-preserving quote workflow

Status: **Claude Code and Claude web verified** on 2026-08-27.

| Field | Public value |
| --- | --- |
| Plugin version | `0.1.6` |
| Package purpose | Preserve requested quantities through Preview and Prepare; require customer approval before broader targeting; distinguish quote updates from paid confirmation; keep quote tokens tool-only; document Company Lookalike's 50,000-company exclusion window and bounded preview retry |
| Production MCP endpoint | `https://mcp.enrichley.io/mcp` |
| Public tool contract | 25 tools |
| Connector policy | Exactly one production connector; no simultaneous standalone or development Enrichley connector |

### Public verification

- Supported update and clean-install paths loaded `0.1.6`, one skill, and one production connector.
- Fresh host checks rendered the Account Status, Preview Results, Run Quote, and Download experiences.
- Deterministic behavior verification preserved requested quantity, prevented unapproved broader targeting, kept quote evidence tool-only, and bounded preview-unavailable retries.
- No paid run was confirmed or started.

## 0.1.5 — Claude cache-boundary release

Status: **Claude verified** on 2026-08-27.

| Field | Public value |
| --- | --- |
| Plugin version | `0.1.5` |
| Package purpose | Deliver Company Lookalike preview-outage guidance under a new Claude cache key and add deterministic update and version controls |
| Production MCP endpoint | `https://mcp.enrichley.io/mcp` |
| Public tool contract | 25 tools |
| Connector policy | Exactly one production connector; no simultaneous standalone or development Enrichley connector |

### Public verification

- Supported update and clean-install paths loaded `0.1.5`, the bundled skill, and one production connector.
- Fresh host checks rendered the Account Status, Preview Results, Run Quote, and Download experiences.
- Invalid-preview handling returned bounded safe guidance without upstream details.
- No paid run was confirmed or started.

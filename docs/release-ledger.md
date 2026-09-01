# Enrichley MCP Plugin Public Release Ledger

This ledger records only public package and compatibility facts. Infrastructure deployment identifiers, private-service source revisions, CI run identifiers, workstation state, tester identities, and account configuration belong in Enrichley's private operational records and must never be added here.

## Release rules

1. Every change to a skill, plugin manifest, connector/app mapping, or bundled asset receives a higher semantic version.
2. Claude and OpenAI manifests carry the same version even when only one host consumes the changed field.
3. Record the public package purpose, public MCP contract, supported hosts, and a sanitized verification result.
4. Do not record credentials, user or account identifiers, infrastructure topology, private repository names, deployment identifiers, or non-public source revisions.
5. A host is marked verified only after a fresh conversation loads exactly one production Enrichley connector and the expected skill version.

## 0.1.8 — Distribution-integrity candidate

Status: **unpublished package-only candidate**. No MCP tool, schema, behavior, endpoint, authentication flow, billing rule, or customer workflow changes.

| Field | Public value |
| --- | --- |
| Plugin version | `0.1.8` |
| Package purpose | Add a sanitized exact public-tool contract and introduced-history validation to the public package safeguards |
| Production MCP endpoint | `https://mcp.enrichley.io/mcp` |
| Public tool contract | 25 tools; unchanged from `0.1.7` |
| Host impact | None; distribution validation and package version only |

### Sanitized verification status

- Repository-local boundary, contract, package, manifest, and host-package validation is required before publication; no live MCP or paid action is part of this candidate.
- Introduced-history validation covers only commits and objects after the reviewed base.
- The full existing-history rewrite, GitHub Support purge, and publication have not occurred. They remain later human-gated work, and no pre-base history cleanliness is claimed.

## 0.1.7 — Public package sanitation

Status: **package-only release**. No MCP tool behavior, skill behavior, endpoint, authentication flow, or customer workflow changed.

| Field | Public value |
| --- | --- |
| Plugin version | `0.1.7` |
| Package purpose | Remove non-functional creator metadata from the public image and add public-repository publishing safeguards |
| Production MCP endpoint | `https://mcp.enrichley.io/mcp` |
| Public tool contract | 25 tools; unchanged from `0.1.6` |
| Public resources | `enrichley://usage-guide`; Account Status `v1`; Preview Results `v3`; Run Quote `v10`; Download `v1` |
| Connector policy | Exactly one production connector; no simultaneous standalone or development Enrichley connector |
| Host impact | None; manifests change only by semantic version and the image pixels are unchanged |

### Sanitized verification

- The Claude and OpenAI package validators passed locally.
- The public-boundary checker confirmed that tracked text and PNG assets contain no prohibited public-release metadata.
- The image's encoded pixel payload is unchanged; only ancillary metadata was removed.
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

### Sanitized verification

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

### Sanitized verification

- Supported update and clean-install paths loaded `0.1.5`, the bundled skill, and one production connector.
- Fresh host checks rendered the Account Status, Preview Results, Run Quote, and Download experiences.
- Sanitized invalid-preview handling returned bounded safe guidance without upstream details.
- No paid run was confirmed or started.

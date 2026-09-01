# OpenAI Plugins Directory submission

This document is the release checklist for publishing Enrichley to the universal public Plugins Directory shared by ChatGPT and Codex. It contains no credentials or verification tokens.

## Customer installation after publication

1. Open **Plugins** in ChatGPT.
2. Search for **Enrichley**.
3. Select **Add**.
4. Select **Connect** and sign in with an Enrichley account.

Developer Mode and repository marketplaces are maintainer test paths. They are not customer onboarding.

## Submission type and production endpoint

- Submission type: **With MCP**, including the bundled `using-enrichley` skill.
- MCP URL type: **Universal**.
- Production MCP URL: `https://mcp.enrichley.io/mcp`.
- Submit the MCP server URL directly. Do not submit the `.app.json` integration reference; that file is only for local and workspace plugin testing.

## Listing metadata

- Display name: `Enrichley`
- Short description: `B2B lead search and enrichment`
- Developer name: `Enrichley`
- Category: `Business & Operations`
- Website: `https://enrichley.io`
- Support: `https://docs.enrichley.io/support`
- Privacy policy: `https://enrichley.com/privacy-policy`
- Terms: `https://enrichley.com/terms-of-service`
- Logo and composer icon: `assets/enrichley.png`
- Light brand color: `#008A57`
- Dark brand color: `#02ECA4`

The light color has at least 2:1 contrast against white. The dark color has at least 2:1 contrast against `#212121`.

`supportURL` and `brandColorDark` are portal fields. The current portable plugin-manifest validator rejects those keys, so they must not be copied into `.codex-plugin/plugin.json` until the package schema supports them.

## Starter prompts

1. `Find decision-makers in my target market with Enrichley`
2. `Build a Company Lookalike audience from a seed domain`
3. `Check my Enrichley jobs and download completed results`

## Positive review cases

1. **Account status:** Ask to check the Enrichley balance. Expect `enrichley_get_account_status`, no credit use, a bounded model-readable result, and the Account Status card.
2. **People Search preview:** Create or reuse a reviewer-owned discovery, apply title and location targeting, then preview it. Expect the discovery workflow and Preview Results card without a paid run.
3. **Company Lookalike preview:** Create or reuse a reviewer-owned discovery from one seed domain and preview it. Expect bounded sample companies and the Preview Results card without a paid run.
4. **Paid-run quote without execution:** Prepare a People Search run quote. Expect the Run Quote card and a request for explicit confirmation; no job or charge is created.
5. **Completed-result handoff:** Use a pre-seeded completed People Search or Company Lookalike run. Expect download instructions and the Download card without returning result rows through MCP.

For every case, the portal entry must include the exact reviewer prompt, expected tool or workflow, expected result shape, and the fixture owned by the reviewer account.

## Negative review cases

1. **Unconfirmed spend:** Ask the assistant to start a paid run without first preparing and confirming a fresh quote. Expect a quote and confirmation request, not execution.
2. **Unsupported Company Lookalike workforce filter:** Ask for a Company Lookalike filter that the public tool schema does not expose. Expect clarification or a supported alternative, not an invented filter.
3. **Ineligible download:** Ask for Email Finder or Email Validation results through the download-instructions tool. Expect a safe explanation that this download path supports completed People Search and Company Lookalike runs only.

## Tool-annotation justifications

The production server must advertise explicit `readOnlyHint`, `openWorldHint`, and `destructiveHint` values for every tool. Enter a justification for each tool in the portal. Tools can share the matching justification below, but every scanned tool must have one.

| Tool class | Annotation values | Portal justification |
| --- | --- | --- |
| Account, job, discovery-list, vocabulary, status, and quote reads | `readOnly=true`, `openWorld=true`, `destructive=false` | Reads customer-owned or live Enrichley/provider data and does not create, update, delete, charge, or start work. It accesses an external service, so it is open-world. |
| Static result schema and download handoff | `readOnly=true`, `openWorld=false`, `destructive=false` | Returns reviewed schema or bounded handoff metadata without changing state or interacting with a third party beyond the closed Enrichley system. |
| Discovery creation and update | `readOnly=false`, `openWorld=true`, `destructive=false` | Creates or updates a customer-owned saved discovery. The change is reversible and starts no paid work. |
| People Search and Company Lookalike preview | `readOnly=false`, `openWorld=true`, `destructive=false` | Executes and may persist a preview or consume preview allowance, but creates no paid run and is not destructive. It queries external provider data. |
| Paid-run preparation | `readOnly=true`, `openWorld=true`, `destructive=false` | Computes a fresh quote and signed confirmation evidence without creating a job, charging credits, or changing customer data. |
| Paid preview and paid run confirmation | `readOnly=false`, `openWorld=true`, `destructive=true` | Starts confirmed work and may reserve or consume customer credits, an irreversible billing or execution side effect. |
| Email Validation | `readOnly=false`, `openWorld=true`, `destructive=true` | Performs live validation and may consume a customer credit. That billing side effect is irreversible even though it does not modify the email address. |

## Portal-only release gates

Do not submit until all are complete:

- The submitter has **Apps Management: Write** in the publishing OpenAI organization.
- Enrichley LLC has a verified business identity in that same organization.
- The portal's generated domain token is hosted at `/.well-known/openai-apps-challenge` on `mcp.enrichley.io` or an accepted parent host, and **Verify Domain** passes.
- **Scan Tools** succeeds against the production MCP URL after the final production deployment.
- The portal has temporary reviewer credentials for a dedicated synthetic Enrichley account, delivered only through the portal and configured to satisfy its review sign-in requirements. Never commit credentials, account identifiers, authentication settings, or recovery details.
- The reviewer account contains no customer data and has only the bounded product access needed for the submitted tests.
- The submission contains exactly five positive and three negative review cases.
- A public demo-recording URL shows the main workflows and tools across the supported hosts.
- If screenshots are submitted, provide one PNG or JPEG per starter prompt, each exactly 706 pixels wide and 400–860 pixels tall.
- Every external frame domain found by the tool scan has a narrow explanation.
- The final skill bundle passes OpenAI's safety and security scan.
- The website and MCP documentation no longer describe ChatGPT as unavailable or describe only the legacy two-tool surface.
- Release notes and policy attestations are reviewed by the owner.

Submitting starts OpenAI review; it does not publish immediately. After approval, an owner chooses when to publish the approved version.

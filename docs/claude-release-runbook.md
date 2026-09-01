# Claude Plugin Release Runbook

Use this runbook to release and verify the Enrichley plugin for Claude Code and Claude web/Cowork. The plugin repository releases directly from `main` as `Enrichley Bot`; do not open a pull request in this repository.

## What is versioned together

Keep these versions identical:

- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json` at `metadata.version`
- `.codex-plugin/plugin.json`

Any change under `skills/`, `assets/`, either plugin manifest directory, `.agents/plugins/`, `.app.json`, `.mcp.json`, or `server.json` requires a higher semantic version. CI enforces this with `scripts/check-release-version.mjs`.

Version `0.1.8` is the current distribution-integrity release. Public repository, contract, package, manifest, Claude, and Codex validations pass. MCP behavior and runtime contracts are unchanged.

## Release the repository

1. Confirm `main` is clean and current.
2. Set the next version in all three version fields above.
3. Add a candidate entry to `docs/release-ledger.md` containing only the public package purpose, public MCP contract, and public host-verification target. Keep infrastructure identifiers and private operational evidence outside this repository.
4. Run the local release checks:

   ```sh
   node scripts/check-public-boundary.test.mjs
   node scripts/check-public-boundary.mjs
   node scripts/check-public-boundary.mjs --base origin/main --history
   node scripts/check-public-contract.test.mjs
   node scripts/check-public-contract.mjs
   node scripts/check-release-version.test.mjs
   node scripts/check-release-version.mjs --base origin/main
   bash scripts/check-skill-commands.sh
   node scripts/check-openai-directory-package.mjs
   claude plugin validate .
   git diff --check
   ```

5. Commit directly to `main` as `Enrichley Bot <agent@enrichley.com>` and push. Do not create a PR.
6. Wait for the `validate` GitHub Actions workflow to pass. Record only its pass/fail outcome in the public ledger; do not record workflow-run or infrastructure identifiers.

The introduced-history check above covers the reviewed `origin/main..HEAD` range. Run `node scripts/check-public-boundary.mjs --all-history` when complete validation of every reachable commit and object is required.

## Prove Claude Code update and install

Update an existing installation:

```sh
claude plugin marketplace update enrichley
claude plugin update enrichley@enrichley
claude plugin list --json
```

The update output must name the old and new versions. The list output must show the release version, `enabled: true`, and `https://mcp.enrichley.io/mcp`.

Then run `/reload-plugins` in Claude Code or restart it and begin a new conversation.

Prove a clean installation when the release warrants it:

```sh
claude plugin uninstall enrichley@enrichley --scope user
claude plugin install enrichley@enrichley --scope user
claude plugin list --json
```

Do not delete Claude's cache directories by hand. The supported marketplace update and plugin update commands are the customer path.

## Prove Claude web/Cowork fresh install

1. Open **Customize -> Plugins -> Add plugin -> Add marketplace -> Add from a repository**.
2. Select the GitHub repository result `getEnrichley/enrichley-mcp-plugin`. Selecting the repository result is more reliable than leaving a pasted URL as free text.
3. Leave **Sync automatically** on and select **Sync**.
4. Open the Enrichley marketplace result. Before selecting **Add**, verify the card displays the expected version, **1 skill**, and **1 connector**.
5. Select **Add**. Authenticate the bundled production connector if Claude asks.
6. Open the installed plugin under **Your plugins** and verify:
   - the expected semantic version;
   - the plugin is enabled;
   - `Skills · 1` contains `/using-enrichley`;
   - `Connectors · 1` contains `enrichley` and says **Connected**.
7. Reload Claude, open `/new`, and run the no-spend smoke matrix below.

### Avoid stale or duplicate connectors

Claude can preserve conversation-level connector selections in an old browser tab. A tab that previously used **Enrichley Dev** can carry that selection into a new conversation even after the production plugin is installed.

Before verification:

1. In **Customize -> Connectors**, confirm the production `enrichley` connector is connected.
2. Remove or disconnect standalone duplicates when practical.
3. In the conversation composer, open **Add files, connectors, and more -> Connectors** and uncheck **Enrichley Dev** or any standalone Enrichley connector.
4. Reload `/new` after changing the plugin or connector selection. Tool catalogs are fixed when a conversation starts; loading the skill later cannot add missing MCP tools to an already stale conversation.

The authoritative tool-call label during production verification is `enrichley`, never `Enrichley Dev`.

## Update an existing Claude web marketplace

Do not assume automatic sync completed. Open the marketplace, run its update/sync control, and verify the displayed plugin version before testing.

Marketplace records are replaced when a repository is removed and added again. After any remove-and-readd recovery, return to the current marketplace listing before syncing; do not reuse an old marketplace URL, browser tab, or cached control. A successful sync of a stale record does not update the replacement record. Verify the current record reports the release commit SHA and a successful sync before trusting the version shown by Claude.

For an internal authenticated browser check, read the current marketplace record first and invoke its first-party account-sync operation only for that exact record. Poll the same record until it reports `sync_status: success`, `sync_errors: null`, and `last_synced_sha` equal to the intended release commit. Never copy organization or marketplace identifiers into this public runbook or release ledger.

Claude can stop a marketplace update with `exec_surface_changed` when executable files or connector settings changed relative to a version members use. This is a security review gate, not a plugin parse failure.

- For an organization marketplace, an owner or admin with marketplace permissions reviews and approves the new executable surface before members update.
- For a disposable personal test marketplace with no customer dependency, removing the stale marketplace and adding the GitHub repository again proves the fresh-install path.
- Do not tell customers to delete a production marketplace as the normal update path. Update/review first; use remove-and-readd only as an explicitly scoped recovery for a test installation.

After any update, reload Claude and start a new conversation.

## No-spend Claude smoke matrix

Use only the production connector and never confirm a paid run.

1. Load `/using-enrichley` and call Account Status once. The Account Status card must render.
2. Preview a known Company Lookalike discovery once. The Preview Results card must render.
3. Prepare a one-result Company Lookalike quote once. The Run Quote card must render; do not confirm it.
4. If a prearranged non-customer Company Lookalike preview fixture is available, call it and require `COMPANY_LOOKALIKE_PREVIEW_UNAVAILABLE`, no upstream detail, a 15-second wait before one retry, and a stop after the second matching response. Claude currently suppresses error-result attachments, so safe text instead of an error card is expected on this host. Do not substitute an arbitrary nonexistent UUID: production rejects those through the generic invalid-response guard and they do not exercise the preview-unavailable branch. If no fixture is available, leave this live-host check explicitly unclaimed and retain the deterministic skill-behavior proof instead.
5. Request Download instructions for a known eligible completed job once. The Download card must render; do not open or execute the download.

Record the results in `docs/release-ledger.md`, including any host limitation or stale-connector recovery. A model's prose about whether a card rendered is secondary evidence; the visible card is authoritative.

## Release completion

Append the final verification evidence to `docs/release-ledger.md`, run `git diff --check`, commit the docs-only closeout directly to `main` as Enrichley Bot, push, and confirm CI is green. Documentation-only evidence does not require another plugin version bump.

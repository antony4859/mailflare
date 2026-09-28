# Zimo Mailflare edition

Modified September 28, 2026, by Zimo from upstream commit 20a941bba6cacae20ca9f89370275965a46c7bef (Mailflare 0.3.0).

Copyright and attribution to Hieu Nguyen and upstream contributors are preserved. This fork remains under GNU AGPL v3; see LICENSE. This is independently maintained and is not an official paid Team subscription.

Changes: enable account management, shared mailbox delegation, forwarding, and branding without commercial activation; retain role, ownership, membership, and permission checks; replace upgrade UI with source information; fix database backup coverage for derived JMAP revision tables.

Source is offered to every user through the sidebar and /source/mailflare-zimo.tar.gz. It contains the application, lockfile, migrations, build scripts, license, and regression tests. Deployment-specific IDs are replaced with the included example configuration. Credentials, email data, node_modules, and build output are excluded. Non-runtime promotional video and audio files are omitted.

Build: npm ci --ignore-scripts, configure wrangler.jsonc from wrangler.jsonc.example, configure runtime secrets as described in docs/deployment.md, then npm run deploy. Requires Node 22 or newer. The tests here use node:sqlite and were verified with Node 26.8.2.

Verification: node --test tests/team-fork.test.mjs tests/backup-schema-coverage.test.mjs. Tests exercise the actual mailbox authorization and forwarding code against SQLite with all migrations, including private inbox isolation, delegated read/send permissions, revocation, disabled mailboxes, and forwarding loop prevention.

Refresh the source archive before every build using npm run source:bundle. Deploy runs this automatically. Preserve this fork's changes when updating upstream. Do not use upstream's automatic update workflow to overwrite the fork.

## Email assistant and shared Hindsight

OpenCode Go is an explicit provider preset. API keys remain server-side; requests identify this app and include a stable session header. OpenCode describes Go as a coding-agent service, so email-automation eligibility must be verified with the provider.

Hindsight connects over Streamable HTTP MCP to the existing zimo-workspace bank. Configure HINDSIGHT_MCP_URL, HINDSIGHT_API_KEY and, for Cloudflare Access, HINDSIGHT_ACCESS_CLIENT_ID and HINDSIGHT_ACCESS_CLIENT_SECRET as server settings/secrets. The client cannot choose a different bank or MCP server. Only recall and retain are exposed.

All automatic reading, categorization, drafting and memory reads/writes are off by default per mailbox. Chat memory controls are per request and reset when switching mailbox. Email-action memory writes reset when the dialog closes. A memory read sends only a general company-context query; a write shares the generated summary or user-enabled chat fact with the shared company bank. Read and write switches are independent. Attachments are not automatically read. Drafts never send automatically.

Apply 0044_zimo_email_assistant.sql before deploying. Existing messages are not backfilled. Automations apply to new eligible inbox mail and retain the existing per-mailbox daily cap, retries and queue leases. Automatic replies are not drafted for list/automated senders. Message summaries and category labels are stored with messages and included in database backups.

Verify with node --test tests/email-analysis.test.mjs tests/hindsight.test.mjs tests/team-fork.test.mjs tests/backup-schema-coverage.test.mjs.

### Simplified assistant flow

The email sparkle button attaches the selected email to a fresh side-panel chat. Suggested tasks and freeform questions use server-authorized email context; attaching alone does not call the LLM or write memory. Shared-memory read and write options remain independent and off by default. Automation setup follows Task → Memory → Review, with a new-email trigger and recent run history. This uses existing UI dependencies and the existing mailbox job queue.

### Team invitations and reply drafts

Administrators can email managed accounts a one-use password setup link valid for 48 hours. Only hashed tokens are stored; retries revoke prior setup links and failed sends revoke their token. Teammates set their own password and retain private mailboxes. Invitation controls are on account details.

Message action menus dismiss on outside click or Escape, and the agent action appears beside Reply. Manually requested self-replies preserve threading; automatic self-replies remain blocked. The conversation displays only the signed-in user's own reply drafts, including for delegated mailboxes.

### Inline replies

Reply drafts open in an inline editor beneath the conversation, with a compact recipient row, autosave status, collapsible details and existing send/review controls. Reply resumes an existing thread draft before creating another. Collapsing preserves the mounted editor; pending saves are flushed when leaving the inline editor. The existing thread, authorization and AI-send approval paths remain in use. Meru/Gmail provided interaction inspiration; no Meru code or dependencies were imported.

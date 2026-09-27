# Zimo Mailflare edition

Modified September 28, 2026, by Zimo from upstream commit 20a941bba6cacae20ca9f89370275965a46c7bef (Mailflare 0.3.0).

Copyright and attribution to Hieu Nguyen and upstream contributors are preserved. This fork remains under GNU AGPL v3; see LICENSE. This is independently maintained and is not an official paid Team subscription.

Changes: enable account management, shared mailbox delegation, forwarding, and branding without commercial activation; retain role, ownership, membership, and permission checks; replace upgrade UI with source information; fix database backup coverage for derived JMAP revision tables.

Source is offered to every user through the sidebar and /source/mailflare-zimo.tar.gz. It contains the application, lockfile, migrations, build scripts, license, and regression tests. Deployment-specific IDs are replaced with the included example configuration. Credentials, email data, node_modules, and build output are excluded. Non-runtime promotional video and audio files are omitted.

Build: npm ci --ignore-scripts, configure wrangler.jsonc from wrangler.jsonc.example, configure runtime secrets as described in docs/deployment.md, then npm run deploy. Requires Node 22 or newer. The tests here use node:sqlite and were verified with Node 26.8.2.

Verification: node --test tests/team-fork.test.mjs tests/backup-schema-coverage.test.mjs. Tests exercise the actual mailbox authorization and forwarding code against SQLite with all migrations, including private inbox isolation, delegated read/send permissions, revocation, disabled mailboxes, and forwarding loop prevention.

Refresh the source archive before every build using npm run source:bundle. Deploy runs this automatically. Preserve this fork's changes when updating upstream. Do not use upstream's automatic update workflow to overwrite the fork.

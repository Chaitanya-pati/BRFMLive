---
name: Frontend dependency installation
description: Replit's package firewall may block vulnerable transitive npm tarballs during Expo installs.
---

When npm installation is blocked by the package firewall, inspect the blocked transitive dependency and update the lockfile to a currently available safe release within the parent's semver range before retrying. In a multi-package workspace, run the install from the app directory so an unrelated root lockfile does not control the repair.

**Why:** Imported Expo projects can fail before the app starts even when their manifest is otherwise valid, because the firewall rejects a resolved transitive archive.

**How to apply:** Use the app's lockfile and package metadata to update only the blocked transitive resolution, then run a full install and web build from that app directory.
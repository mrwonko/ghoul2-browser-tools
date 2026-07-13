# One-time deploy setup

Run once, on your own machine and server — nothing here is done by CI.

## 1. Generate a dedicated deploy keypair

    ssh-keygen -t ed25519 -N "" -C "deploy@ghoul2-browser-tools" -f deploy_key

`-N ""` is required — GitHub Actions can't type a passphrase. This key should
be used for nothing else.

## 2. Restrict it server-side to rsync-only, write-only, into one directory

Create the target directory first — `rsync`'s receiver does a single,
non-recursive `mkdir` on the destination, so it will fail (`mkdir "..."
failed: No such file or directory`) if the directory or any parent doesn't
already exist:

    mkdir -p /absolute/path/to/target/dir

Append a line to the target user's `~/.ssh/authorized_keys` (the *public*
half, `deploy_key.pub`, prefixed with `restrict,command="..."`):

    restrict,command="rrsync -wo /absolute/path/to/target/dir" ssh-ed25519 AAAA...deploy_key_contents... deploy@ghoul2-browser-tools

- `rrsync` ships with rsync (commonly at `/usr/bin/rrsync`) — confirm it's
  present on the server (`which rrsync`) before adding the line.
- `-wo` = write-only: this key can push files into the directory but can
  never read its contents back over this connection — if the private key
  ever leaks, the blast radius is "can overwrite the site," not "can read
  the server."
- The directory argument is the actual security boundary: `rrsync` `chdir`s
  into it server-side and confines every operation underneath it — the
  client cannot escape above it. It does **not** ignore the path the client
  sends, though: `rrsync` resolves that path *relative to* this directory
  (see `DEPLOY_TARGET_PATH` below). It **must be a directory used for
  nothing else** — the deploy script runs `rsync --delete`, so anything
  placed there outside a deploy gets removed on the next run.
- `restrict` (modern OpenSSH shorthand) disables port/X11/agent forwarding,
  PTY allocation, and user rc execution for this key — matching the existing
  convention already used for other restricted entries in this file.

## 3. Populate GitHub Actions secrets (repo Settings → Secrets and variables → Actions)

| Secret                   | Value                                                              |
|--------------------------|---------------------------------------------------------------------|
| `DEPLOY_SSH_PRIVATE_KEY` | Full contents of `deploy_key` (the *private* half)                 |
| `DEPLOY_SSH_HOST`        | Server hostname or IP                                              |
| `DEPLOY_SSH_USER`        | The remote user whose `authorized_keys` you edited in step 2       |
| `DEPLOY_SSH_PORT`        | SSH port, only if not 22                                           |
| `DEPLOY_TARGET_PATH`     | Path dist/ lands at, **relative to** the `rrsync` DIR from step 2 (`rrsync` chdirs into DIR, then resolves this path against it) — use `.` to land directly in DIR. Repeating DIR's absolute path here causes rsync to try creating DIR/\<that path\> and fail with a `mkdir` error, since it doesn't exist |
| `DEPLOY_KNOWN_HOSTS`     | Output of `ssh-keyscan -H -p <port> <host>` run against the server |

## 4. (Recommended) sanity-check before relying on CI

From your own machine, with the same key/host, try a manual push into the
target dir with plain `rsync`/`ssh` before trusting the workflow with it —
this isolates server-config problems from workflow-config problems.

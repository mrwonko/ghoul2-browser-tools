import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath on a URL ending in '/' always yields a path ending in the
// platform separator, so `root` is guaranteed sep-terminated below.
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.PORT ?? 4173);
const mime = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png',
};

createServer(async (req, res) => {
  let requestPath;
  try {
    // Malformed percent-encoding (e.g. a lone trailing '%') throws a
    // URIError here. Left uncaught, that crashes this whole process — since
    // this is Playwright's shared webServer for the entire suite, one bad
    // request would fail every subsequent test with confusing
    // connection-refused errors instead of just 400ing the one request.
    requestPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  const relative = requestPath === '/' ? 'index.html' : requestPath.slice(1);
  // Resolve against root and verify the result is still rooted there, rather
  // than trying to enumerate/strip `..` segments ourselves — `resolve()`
  // collapses `.`/`..` the same way the filesystem would, so there's no
  // encoding or segment-splitting edge case left to get wrong.
  const resolved = resolve(root, relative);
  if (!resolved.startsWith(root)) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const data = await readFile(resolved);
    res.writeHead(200, { 'Content-Type': mime[extname(resolved)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(port);

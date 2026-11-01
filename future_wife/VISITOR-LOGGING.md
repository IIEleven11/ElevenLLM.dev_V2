# Visitor logging

## Porkbun Static Hosting

Porkbun's [GitHub Connect](https://kb.porkbun.com/article/145-how-to-connect-static-hosting-to-github)
can continue publishing the static page when the connected branch is updated.
The Node server below cannot run on Porkbun Static Hosting, so pushing it to
GitHub will not enable visitor logging.

First check the Static Hosting dashboard or ask Porkbun support:

- Are HTTP access logs available for this hosting plan?
- Do they include the visitor IP address, user-agent and request timestamp?
- How can the site owner view them, and can retention be limited to 30 days?

Porkbun's public hosting documentation does not establish that these logs are
available. If they are, use the provider's instructions and restrict access to
authorized administrators. Tell visitors what is collected and confirm the
retention period.

If Porkbun cannot provide the requested logs, the planned alternative is a
[Firebase HTTPS function](https://firebase.google.com/docs/functions/http-events)
called by the static page. This preserves GitHub Connect but requires a separate
Firebase deployment and the Blaze billing plan, which can incur charges.
Confirm the intended project and site origin before setting it up. Firebase's
Cloud Logging `_Default` bucket normally retains logs for 30 days, but verify
the project's actual retention settings and any additional log exports. Do not
place credentials or visitor logs in the GitHub repository. A browser request
can be blocked or fail, so this alternative cannot guarantee every visit is
counted.

## Self-hosted Node server

Run the page with Node.js 18 or later:

```sh
node future_wife/visitor-server.mjs
```

Open `http://127.0.0.1:8080/`. Each GET of the page records a timestamp,
the connecting IP address and the browser's user-agent string in
`~/.local/state/lily-site/visits.jsonl`. Image requests and HEAD requests are
not counted. The server requires a private log directory and creates the log
with owner-only permissions. The log is not accessible through the website.

This server must actually serve the live site for visits to be recorded;
adding these files to a static host alone does not enable logging. `PORT` and
`HOST` can configure the listener (for example, `HOST=0.0.0.0 PORT=8080`).
Use HTTPS through a properly configured reverse proxy for public deployment.
Behind a proxy, the logged IP is the proxy's address: forwarded IP headers are
deliberately not trusted.

IP addresses and user-agent strings may be personal data. Tell visitors what is
collected, restrict access to the log, and set a retention/deletion policy
appropriate for the site. No automatic log rotation or deletion is configured.
The server serves the current page and `lilycave.png`; add future public assets
to its explicit asset list when the page changes.

Run the tests with `node --test future_wife/visitor-server.test.mjs`.

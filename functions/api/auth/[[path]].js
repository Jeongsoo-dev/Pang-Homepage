export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = url.pathname; // /api/auth or /api/auth/callback

  // 환경변수 (Cloudflare Pages -> Settings -> Environment variables)
  const CLIENT_ID = context.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = context.env.GITHUB_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return new Response(
      "Missing GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET in Cloudflare Pages environment variables.",
      { status: 500 }
    );
  }

  // 1) Start OAuth
  if (pathname === "/api/auth") {
    const siteUrl = `${url.protocol}//${url.host}`;
    const redirectUri = `${siteUrl}/api/auth/callback`;

    // Decap CMS expects "site_id" sometimes; keep it simple
    const state = crypto.randomUUID();

    const ghAuth = new URL("https://github.com/login/oauth/authorize");
    ghAuth.searchParams.set("client_id", CLIENT_ID);
    ghAuth.searchParams.set("redirect_uri", redirectUri);
    ghAuth.searchParams.set("scope", "repo");
    ghAuth.searchParams.set("state", state);

    return Response.redirect(ghAuth.toString(), 302);
  }

  // 2) OAuth callback -> exchange code -> return token to Decap
  if (pathname === "/api/auth/callback") {
    const code = url.searchParams.get("code");
    if (!code) return new Response("Missing code", { status: 400 });

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      }),
    });

    const tokenJson = await tokenRes.json();
    if (!tokenJson.access_token) {
      return new Response(`OAuth failed: ${JSON.stringify(tokenJson)}`, { status: 400 });
    }

    // Decap CMS expects this HTML response that posts a message back to the opener window.
    const body = `<!doctype html>
<html>
  <body>
    <script>
      (function () {
        const token = ${JSON.stringify(tokenJson.access_token)};
        const message = 'authorization:github:' + JSON.stringify({ token: token, provider: 'github' });
        window.opener.postMessage(message, window.location.origin);
        window.close();
      })();
    </script>
  </body>
</html>`;

    return new Response(body, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new Response("Not found", { status: 404 });
}

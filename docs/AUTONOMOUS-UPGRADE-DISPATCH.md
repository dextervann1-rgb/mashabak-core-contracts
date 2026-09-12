# Secure Autonomous Upgrade Dispatch

The upgrade workflow is **Base-only** and accepts two triggers:

- `workflow_dispatch` for manual execution from the GitHub Actions interface.
- `repository_dispatch` with event type `auto_upgrade_requested` for an authenticated server-side application request.

The workflow targets **Base Sepolia** (`base-sepolia`, chain ID `84532`) and runs compilation, upgrade tests, storage-layout validation, the proxy upgrade, and BaseScan verification. It is protected by the `base-sepolia` GitHub Environment.

## Required GitHub configuration

Configure these secrets in the repository's `base-sepolia` Environment:

| Secret | Purpose |
| --- | --- |
| `BASE_SEPOLIA_PROXY_ADDRESS` | Existing Base Sepolia transparent proxy address |
| `BASE_SEPOLIA_RPC` | Base Sepolia RPC endpoint |
| `DEPLOYER_PRIVATE_KEY` | Dedicated Base Sepolia upgrade wallet |
| `BASESCAN_API_KEY` | BaseScan verification key |

The dispatch token is **not** a repository secret. It belongs in the server-side application that is authorized to request a workflow run.

## GitHub token requirements

Use a fine-grained GitHub token owned by an appropriate service identity. Grant only the minimum repository permission required to dispatch workflows. Do not use a broad classic token when a fine-grained token is available.

Store the token only as a server-side environment variable:

```dotenv
GITHUB_DISPATCH_TOKEN=replace-with-a-server-side-token
GITHUB_OWNER=dextervann1-rgb
GITHUB_REPO=mashabak-core-contracts
```

Never expose this value to browser JavaScript, commit it to `.env.local`, or include it in client-side bundles. Add `.env.local` to the consuming application's `.gitignore`.

## Next.js route example

Place this code in the consuming application, not in this contracts repository, for example at `app/api/deploy/route.ts`:

```ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Replace this with the application's real session and role check.
  const authorization = request.headers.get("authorization");
  const expected = process.env.INTERNAL_DEPLOYMENT_AUTH_TOKEN;

  if (!expected || authorization !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    return NextResponse.json(
      { error: "Deployment service is not configured." },
      { status: 500 }
    );
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "auto_upgrade_requested",
        client_payload: { requested_by: "authorized-admin" },
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.error("GitHub dispatch failed:", await response.text());
    return NextResponse.json(
      { error: "Failed to dispatch Base upgrade workflow." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Base Sepolia upgrade workflow dispatched.",
  });
}
```

The browser should call the consuming application's `/api/deploy` route, never GitHub directly.

## Direct API test

From a secure server terminal only:

```bash
curl --fail-with-body -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_DISPATCH_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/dextervann1-rgb/mashabak-core-contracts/dispatches \
  -d '{"event_type":"auto_upgrade_requested"}'
```

A successful dispatch returns HTTP `204`.

## Base Mainnet safety

Base Mainnet uses `base-mainnet` and chain ID `8453`. Do not switch the Sepolia workflow by changing one string. Use a separate protected `base-mainnet` GitHub Environment, a distinct `BASE_MAINNET_PROXY_ADDRESS` secret, `BASE_MAINNET_RPC`, and required reviewers. For production governance, prefer a Safe multisig or TimelockController as the ProxyAdmin owner so an application endpoint cannot unilaterally upgrade the proxy.

// Runs before `npm run dev`.
// The ASP.NET Core API uses a local HTTPS development certificate. Browsers trust it,
// but Node.js (which forwards /api/* to the API) does not, so we export its public part once
// and point Node at it with NODE_EXTRA_CA_CERTS (see the "dev" script in package.json).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";

const certPath = ".certs/aspnet-dev.pem";
const keyPath = ".certs/aspnet-dev.key";

if (existsSync(certPath)) {
  process.exit(0);
}

mkdirSync(".certs", { recursive: true });

try {
  execFileSync(
    "dotnet",
    ["dev-certs", "https", "--export-path", certPath, "--format", "Pem", "--no-password"],
    { stdio: "ignore" },
  );
  // The export also writes the private key. Node only needs the certificate, so delete the key.
  rmSync(keyPath, { force: true });
  console.log(`Exported the ASP.NET Core dev certificate to ${certPath}`);
} catch {
  console.warn(
    "Could not export the ASP.NET Core dev certificate. Run: dotnet dev-certs https --trust",
  );
}

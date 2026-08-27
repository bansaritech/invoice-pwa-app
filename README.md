# Invoice Simple

Static invoicing PWA for GitHub Pages. Enable GitHub Pages from the repository's **Settings → Pages**, selecting the deployment branch and `/ (root)`.

Data lives in `data.json`. Settings and GitHub publishing are intentionally available only from the installed PWA. The app retains the repository and branch in IndexedDB; it encrypts a supplied token with a non-extractable Web Crypto key before storing it. The token is never displayed again and a new entry replaces it. Use a fine-grained, repository-scoped GitHub token with **Contents: Read and write** permission.

An installed web app cannot offer the same secret protection as an OS keychain: JavaScript served by this origin can access the encrypted value. Keep the site trusted, use the minimum GitHub permission, and rotate/revoke the token if the device or repository is compromised.

For production, replace the Tailwind CDN script with a compiled Tailwind stylesheet if you want to eliminate the CDN dependency.
# invoice-pwa-app

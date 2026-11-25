# Mithun Bhai Service — starter

## Deploy on Render
1. Upload the **contents** of this project to the GitHub repository (not only this ZIP).
2. In Render, create or configure a **Web Service**.
3. Runtime/Language: **Node**.
4. Root Directory: leave blank if `package.json` is in the repository root.
5. Build Command: `npm install`
6. Start Command: `npm start`
7. Deploy.

The home page is served from `public/index.html`. The `/health` endpoint returns a small health-check response.

## Important safety note
This is a **demo starter only**. It does not process payments, verify payment, store inventory, authenticate admins, or deliver real IDs/passwords. Do not upload real credentials or accept customer payments with this version. Those features need secure implementation, payment-gateway verification, protected admin access, and persistent secure storage before launch.

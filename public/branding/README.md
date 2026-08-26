# Branding

`logo-placeholder.svg` is a placeholder mark used on the public site, dashboard, and printed zine (cover + back page) until real Tampereen Käyttäjäyhteisö branding is available.

To replace it:

1. Drop the real logo file into this folder (SVG preferred; PNG/JPG also work).
2. In the admin settings page (`/admin/asetukset`), update the "Logon polku" field to point at the new filename, e.g. `/branding/logo.svg`.
3. Redeploy (or restart the server process).

No code changes are required — the logo path is stored in the database (`SiteSettings.logoPath`) and read wherever the logo is shown. The restart in step 3 is needed because this folder is served as a static Next.js asset, which only picks up files that existed when the server started — unlike article images and zine PDFs (uploaded/generated while the app is running), which are served dynamically and need no restart.

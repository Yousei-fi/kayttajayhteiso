# Branding

`logo.jpeg` is the real Tampereen Käyttäjäyhteisö logo, used on the public site, dashboard, and printed zine (cover + back page). The site's color palette (`src/app/globals.css`) and the zine's print template (`src/lib/zine-html.ts`) were both sampled from it: purple `#7137e3`, blue `#2f8fe0`, magenta `#d356ef`.

To replace it with a different or updated logo file:

1. Drop the new file into this folder.
2. Set its path in `/admin/asetukset` ("Logon polku"), e.g. `/branding/new-logo.svg`.
3. Redeploy / restart the server.

No code changes are required — the logo path is stored in the database (`SiteSettings.logoPath`) and read wherever the logo is shown. The restart in step 3 is needed because this folder is served as a static Next.js asset, which only picks up files that existed when the server started — unlike article images and zine PDFs (uploaded/generated while the app is running), which are served dynamically and need no restart.

If the new logo has a noticeably different color scheme, also update the sampled hex values in `src/app/globals.css` (`:root` block) and `src/lib/zine-html.ts` (`zineCss` function) to match.

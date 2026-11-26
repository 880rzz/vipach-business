# vipach-business
The website is deployed from the root of the `main` branch by GitHub Pages.
Site files remain at the root and in the public locale/asset directories.
Repository-only items are under `.github/`, which Pages does not publish.

- `.github/apps-script/google-apps-script.gs` is the Google Apps Script project source kept for maintenance. The website submits only to the existing deployed Google Apps Script endpoint; the source file itself is not a website asset.
- Run the repository checks from the repository root: `node .github/checks/check-seo-integrity.mjs` and the other check files used in `seo-integrity.yml`.
- For a local runtime-only Pages artifact: `node .github/checks/build-publication.mjs /tmp/vipach-business-public` (output must not exist).

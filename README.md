# induandvivek.com

Static wedding site (GitHub Pages) with a Google Sheet for RSVPs.

```
index.html            the page
assets/styles.css     design + the 4 colour themes
assets/app.js         RSVP form + SETTINGS at the top
apps-script/Code.gs   Google Sheet backend (paste into Apps Script)
CNAME                 custom domain for GitHub Pages
```

## 1. Connect the Google Sheet (about 10 minutes)

1. Create a new Google Sheet, e.g. "Indu & Vivek RSVPs".
2. **Extensions → Apps Script**. Delete the sample code and paste in all of `apps-script/Code.gs`.
   Optional: set `NOTIFY_EMAIL` to get an email for every RSVP.
3. Choose `setup` in the function dropdown and press **Run**. Approve the permission prompt
   (Google will warn the app is unverified: **Advanced → Go to project**). This creates
   the **Responses**, **Summary** and **Guest List (latest)** tabs.
4. **Deploy → New deployment →** type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone** (not "Anyone with Google account")
5. Copy the Web app URL (ends in `/exec`) and paste it into `scriptUrl` in `assets/app.js`.
6. To change `Code.gs` later: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.
   This keeps the same URL.

How the sheet works:
- One row per guest. Columns show Yes/No for each event plus Adult/Child.
- Email is required; mobile number is optional (with a country code, default India +91). No texts are ever sent.
- If someone submits again with the same **email**, their old rows become **Replaced**.
  The Summary and Guest List tabs only count **Active** rows.
- Every RSVP gets a confirmation email from the Google account that owns the Sheet, with a
  confirmation number like `IV-7KQ2MX`. A personal Gmail account can send about 100 emails a day.
  If that limit is hit, the email is saved in the **Email Queue** tab and sent automatically
  (an hourly job created by `setup()`) once the limit resets. The Summary tab shows how many are waiting.
- Tip: send the RSVP link from the same Gmail address, so guests recognise the sender and the
  confirmation is less likely to land in Spam.

## 2. Choose a theme

In `assets/app.js`, set `theme` to `pattu`, `geru`, `aaku` or `gadwal`,
and set `showThemePicker: false`. Also set `data-palette` on the `<html>` tag in
`index.html` to the same theme, so the page doesn't flash another theme while it loads.
Set `rsvpDeadline` (e.g. `'January 10, 2027'`) when you've decided on one.

## 3. Publish on GitHub Pages

1. Create a GitHub repository (it can be public or, on a paid plan, private) and upload these files to the `main` branch.
2. **Settings → Pages →** Source: *Deploy from a branch*, Branch: `main`, folder `/ (root)`.
3. Custom domain: `induandvivek.com` (the `CNAME` file already contains it). Tick **Enforce HTTPS**
   once it becomes available (can take up to an hour after DNS is set).

## 4. Domain DNS

Buy `induandvivek.com` (Cloudflare Registrar, Porkbun, Namecheap and Squarespace Domains all work), then add:

| Type  | Name  | Value |
|-------|-------|-------|
| A     | @     | 185.199.108.153 |
| A     | @     | 185.199.109.153 |
| A     | @     | 185.199.110.153 |
| A     | @     | 185.199.111.153 |
| AAAA  | @     | 2606:50c0:8000::153 |
| AAAA  | @     | 2606:50c0:8001::153 |
| AAAA  | @     | 2606:50c0:8002::153 |
| AAAA  | @     | 2606:50c0:8003::153 |
| CNAME | www   | YOUR-GITHUB-USERNAME.github.io |

If you use Cloudflare, set these records to **DNS only** (grey cloud) until GitHub has issued the HTTPS certificate.
Recommended: verify the domain under GitHub **Settings → Pages → Verified domains** so no one else can claim it.

## 5. Test before sharing

Submit a test RSVP from your phone, check it appears in the sheet, then delete the test rows.

## Things to fill in later
- Welcome Dinner venue (`index.html`, Events section)
- Wedding-day calendar link times: currently 9:30 AM–2:30 PM as a placeholder (`index.html`, "Add to calendar" link `dates=`)
- Hotel room block booking details (Travel section, "Stay")

## Muggu and banana leaf artwork

The muggu (one continuous line woven around a grid of dots) and the banana leaf are drawn by
`tools/gen-symbols.js`. To regenerate them after changing a size or the dot grid:

```
node tools/gen-symbols.js index.html
```

# Changelog
v2.10.4
- Update the bundled `patreon-dl` library to v3.10.1.
- Add GUI controls for post title, collection, and tag exclusion filters, post ordering, and concurrent post processing.
- Concurrent processing honors stop conditions; posts already in progress may finish after a stop condition is met.

v2.10.0
- Update `patreon-dl` library to v3.9.0 ([changelog](https://github.com/patrickkfkan/patreon-dl/blob/f35991806e4c14a449b8822e1286282c00c9a91a/CHANGELOG.md)).
- Add support for `media.index` in media filename format ([#60](https://github.com/patrickkfkan/patreon-dl-gui/issues/60)).
- Add support for custom embed downloaders.

v2.9.0
- Update `patreon-dl` library to v3.8.1 ([changelog](https://github.com/patrickkfkan/patreon-dl?tab=readme-ov-file#changelog)).
- Add function to save / reset default settings. Access via `File -> Default Settings` menu.

v2.8.0
- Update `patreon-dl` library to v3.7.1 ([changelog](https://github.com/patrickkfkan/patreon-dl?tab=readme-ov-file#changelog))
- Add more insertable fields to `Output -> Media filenmae format` input
- Add `Include -> Protected media` option
- Fix certain collection-type targets not identified

v2.7.2
- Fix target identification issues with "cw" pages ([#50](https://github.com/patrickkfkan/patreon-dl-gui/issues/50)).
- Vimeo download script: include search params in player URL.

v2.7.1
- Update `patreon-dl` library to v3.6.1 ([changelog](https://github.com/patrickkfkan/patreon-dl?tab=readme-ov-file#changelog))
- Fix Embedly download script error on retrying with alternative URL ([patreon-dl#118](https://github.com/patrickkfkan/patreon-dl/issues/118)).

v2.7.0
- Update `patreon-dl` library to v3.6.0 ([changelog](https://github.com/patrickkfkan/patreon-dl?tab=readme-ov-file#changelog))
- Add SproutVideo support (requires [yt-dlp](https://github.com/yt-dlp/yt-dlp))

v2.6.0
- Update `patreon-dl` library to v3.5.0:
  - Support downloading all products from a creator's shop.
  - Save Collection info when downloading posts; enable browsing posts by collection.
  - Add search functionality in Browse.
  - Save post tags; enable filtering posts by tag.
  - Add `Media thumbnails` option to `Include -> General` tab.
- Centralize URL normalization ([@wallstop](https://github.com/wallstop) - [#36](https://github.com/patrickkfkan/patreon-dl-gui/pull/36))

v2.5.0
- Update `patreon-dl` library to v3.4.0
  - Fix YouTube download error ([#31](https://github.com/patrickkfkan/patreon-dl-gui/issues/31))
  - Fix "no posts found" on "cw" pages ([#30](https://github.com/patrickkfkan/patreon-dl-gui/issues/30))
  - [Full changelog](https://github.com/patrickkfkan/patreon-dl?tab=readme-ov-file#changelog)
- New settings in "Other" tab:
  - Path to Deno
  - Max video resolution

v2.4.2
- Update `patreon-dl` library to v3.3.1
  - Fix YouTube download error ([#28](https://github.com/patrickkfkan/patreon-dl-gui/issues/28))
  - Browse: add next / previous links to post page
  - Some DB optimizations
  - [Full changelog](https://github.com/patrickkfkan/patreon-dl#changelog)
- Fix target identification sometimes fail for custom-domain pages

v2.4.1
- Update `patreon-dl` library to v3.2.1
  - Fix log file path sanitization returning invalid path in some cases on Windows, causing download process to fail right at the beginning.
- Fix target identification error when proxy is used ([#24](https://github.com/patrickkfkan/patreon-dl-gui/issues/24))


v2.4.0
- Update `patreon-dl` library to v3.2.0
- Fix target identification issues with "cw" ([#22](https://github.com/patrickkfkan/patreon-dl-gui/issues/22)) and custom-domain pages
- Change default output directory to `<HOME_DIR>/patreon-dl` ([@Anthonyy232](https://github.com/Anthonyy232) - [#19](https://github.com/patrickkfkan/patreon-dl-gui/issues/19))
- Add "yt-dlp args" input to Vimeo helper script options
- Fix cookies not being fetched completely

v2.3.0
- Update `patreon-dl` library to v3.1.0
- If you got hit by Cloudflare verification loop, this should now be fixed.
- Add web browser settings with:
  - option to clear session data
  - option to set a custom user agent (mainly for debugging purpose - do not use unless you know what you're doing)
- Add reload button to web browser
- On Windows, Start Menu folder should now have the correct name "patreon-dl-gui".
- Add server console for managing servers providing access to downloaded content

v2.2.0
- Update `patreon-dl` library to v3.0.0
- Bug-fixes:
  - "Browser not secure" message / disabled sign-in button for Google account sign-ins
  - Downloading from creators without vanity ([#4](https://github.com/patrickkfkan/patreon-dl-gui/issues/4))
  - "Shell not supported" error when running on macOS ([#6](https://github.com/patrickkfkan/patreon-dl-gui/issues/6))
  - "403 - Forbidden" errors when downloading Patreon-hosted videos ([#8](https://github.com/patrickkfkan/patreon-dl-gui/issues/8))
  - Values inserted through textbox insertion links not persisting ([#9](https://github.com/patrickkfkan/patreon-dl-gui/issues/9))
- Vimeo helper script: fallback to embed URL if player URL fails to download

v2.1.0
- Update `patreon-dl` library to v2.4.2 (mainly fixes YouTube download issues)
- Fix compatibility with Node JS v23 ([#2](https://github.com/patrickkfkan/patreon-dl-gui/issues/2))
- Simplify downloading embedded Vimeo videos through helper script

v2.0.0
- Major UI overhaul: web browser is now embedded into the main window
- Remove the need to download web browser dependency
- One-click to apply proxy settings to web browser session
- Add option to connect to YouTube acount for embedded YouTube videos
- File logger is disabled by default
- Bugfixes

v1.0.0
- Initial release


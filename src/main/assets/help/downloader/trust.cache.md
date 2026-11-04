## Trust cache

If enabled, posts with a successful entry in the status cache are skipped immediately. Trust cache does not check the post folder, downloaded files, destination, downloader version, post edits, comment count, or current include settings. A post may therefore be skipped even when its folder or files are missing, or when the current run requests parts that were not included in the previous run.

The status cache tracks post info, preview media, content media, and comments as completed, not requested, failed, or unknown. New entries with failed or unknown parts are not trusted. Older entries without part statuses are trusted when they have no recorded errors.

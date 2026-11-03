# Acquisition and processing gate

- Exact landing page and direct file/API method; attribution, creator, license URL/version, permission to transform and redistribute; access date and evidence snapshot in `.TMP`.
- Expected size cap, MIME/container, SHA-256 after download, duration, dimensions, codecs, decoder availability and category.
- HTTPS with timeout/retry budget; restrict redirects and destinations, reject HTML/error bodies, partial downloads and excessive sizes. No arbitrary executable downloads.
- Run local FFprobe with argument arrays (never interpolated shell commands). Probe duration and stream metadata, then decode the complete file with FFmpeg to detect corruption. Bound processing time and output size.
- Optimize to tested codec/container, strip audio by default, retain attribution next to the cached asset; compare decoder behavior on packaged Windows build.
- Verify interrupted/corrupt/oversized downloads, offline cache, unavailable source, invalid license, path traversal, duplicates, missing FFmpeg, and import without network.

Sources: https://ffmpeg.org/ffprobe.html and https://ffmpeg.org/ffmpeg.html. Actual asset evidence belongs in the project's source catalog in Phase 2, not in skill metadata.

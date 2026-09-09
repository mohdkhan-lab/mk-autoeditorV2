// Parse an image filename into a start time in seconds, or null if it doesn't
// encode a timestamp. Naming is colon-free (Windows-safe): mm-ss / mm_ss,
// hh-mm-ss, bare mmss (3-4 digits), or bare seconds (1-2 digits).
function parseSingleHms(str) {
  if (!str) return null;
  let m;
  // hh-mm-ss or hh:mm:ss
  if ((m = str.match(/^(\d+)[-_:](\d{1,2})[-_:](\d{1,2})$/))) {
    return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]);
  }
  // mm-ss or mm:ss
  if ((m = str.match(/^(\d+)[-_:](\d{1,2})$/))) {
    return (+m[1]) * 60 + (+m[2]);
  }
  // bare digits
  if ((m = str.match(/^\d+$/))) {
    if (str.length >= 3) {
      const secs = +str.slice(-2);
      const mins = +str.slice(0, -2);
      return mins * 60 + secs;
    }
    return +str; // 1-2 digits → plain seconds
  }
  return null;
}

// Parse a range like #00-04, #04-06, #06-10, #60-65 or #01-00_01-05
export function parseTimestampRange(filename) {
  if (!filename || typeof filename !== "string") return null;
  let base = filename.split(/[\\/]/).pop().split(".")[0].trim();
  base = base.replace(/[-_]\d{8,}$/, ""); // drop datestamps

  const hasHash = base.startsWith("#");
  if (hasHash) base = base.slice(1).trim();

  // Range pattern 1: mm-ss_mm-ss or mm:ss-mm:ss (e.g. 01-00_01-05 or 00:00-00:04)
  let rm = base.match(/^((?:\d{1,2}[-_:])?\d{1,2}[-_:]\d{2})[-_~]((?:\d{1,2}[-_:])?\d{1,2}[-_:]\d{2})$/);
  if (rm) {
    const start = parseSingleHms(rm[1]);
    const end = parseSingleHms(rm[2]);
    if (start != null && end != null && end > start) {
      return { start, end, duration: +(end - start).toFixed(3) };
    }
  }

  // Range pattern 2: #00-04, #04-06, #06-10, #60-65 (plain second numbers with dash)
  // When a leading # is used, A-B is explicitly interpreted as startSec-endSec
  if (hasHash) {
    const sm = base.match(/^(\d+)[-_](\d+)$/);
    if (sm) {
      const start = +sm[1];
      const end = +sm[2];
      if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
        return { start, end, duration: +(end - start).toFixed(3) };
      }
    }
  }

  return null;
}

export function parseTimestampName(filename) {
  if (!filename || typeof filename !== "string") return null;

  // 1. Check if it's an explicit range first (e.g. #00-04, #04-06, #06-10)
  const range = parseTimestampRange(filename);
  if (range != null) return range.start;

  // 2. Otherwise process as a start timecode (handling legacy mm-ss, hh-mm-ss, etc.)
  let base = filename.split(/[\\/]/).pop().split(".")[0].trim();
  base = base.replace(/[-_]\d{8,}$/, "");
  if (base.startsWith("#")) base = base.slice(1).trim();

  let res = parseSingleHms(base);
  if (res != null) return res;

  // If a descriptive prefix exists (e.g. "scene1_0-03", "clip_0-15", "video-00-10"), test without it
  const withoutPrefix = base.replace(/^[a-zA-Z]+[\w]*[-_]/, "");
  res = parseSingleHms(withoutPrefix);
  if (res != null) return res;

  // If a trailing descriptor exists (e.g. "0-03_clip", "0-15-scene"), test without it
  const withoutSuffix = base.replace(/[-_][a-zA-Z]+[\w]*$/, "");
  res = parseSingleHms(withoutSuffix);
  if (res != null) return res;

  // Look for any isolated timecode component in the filename (e.g. "forest_0-03_sunset")
  const embedded = base.match(/(?:^|[-_])(\d{1,2}[-_]\d{1,2}(?:[-_]\d{1,2})?)(?:[-_]|$)/);
  if (embedded) {
    res = parseSingleHms(embedded[1]);
    if (res != null) return res;
  }

  return null;
}

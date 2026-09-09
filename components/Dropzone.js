"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Recursively read every File out of a dropped entry (file or directory).
// readEntries returns in batches of ~100, so we keep reading until it's empty.
function readEntry(entry, out) {
  return new Promise((resolve) => {
    if (entry.isFile) {
      entry.file((f) => { out.push(f); resolve(); }, () => resolve());
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const readBatch = () => reader.readEntries(async (batch) => {
        if (!batch.length) return resolve();
        await Promise.all(batch.map((e) => readEntry(e, out)));
        readBatch();
      }, () => resolve());
      readBatch();
    } else {
      resolve();
    }
  });
}

function isAcceptedFile(file, accept) {
  if (!accept) return true;
  const types = accept.split(",").map((s) => s.trim().toLowerCase());
  const ftype = (file.type || "").toLowerCase();
  const fname = (file.name || "").toLowerCase();
  for (const t of types) {
    if (t === "*/*" || t === "*") return true;
    if (t.endsWith("/*")) {
      const group = t.slice(0, -2);
      if (ftype.startsWith(`${group}/`)) return true;
      if (group === "image" && /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(fname)) return true;
      if (group === "video" && /\.(mp4|mov|webm|mkv|avi|m4v|3gp|wmv)$/i.test(fname)) return true;
      if (group === "audio" && /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(fname)) return true;
    } else if (t.startsWith(".")) {
      if (fname.endsWith(t)) return true;
    } else if (ftype === t) {
      return true;
    }
  }
  return false;
}

// A click-or-drop file input. Dropping folders (even several at once) pulls in
// every file inside; `filled` swaps the label to the loaded state.
export default function Dropzone({
  accept, multiple, onFiles, compact,
  icon, title, hint, filled, filledLabel,
}) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  // On touch devices, accept="image/*" makes Android open Google Photos, which
  // renames files (losing the timestamp). Dropping `accept` opens the Files /
  // Documents picker instead, which preserves the real filename (0-03.png).
  // addImages/onAudio still filter by type, so nothing unwanted gets through.
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    try { setCoarse(window.matchMedia && window.matchMedia("(pointer: coarse)").matches); } catch { /* ignore */ }
  }, []);

  const onDrop = useCallback(async (e) => {
    e.preventDefault();
    setOver(false);
    const dt = e.dataTransfer;
    if (!dt) return;

    // Folder-aware path (only for multi-file zones like images/videos). webkitGetAsEntry
    // must be called synchronously during the drop, so grab the entries first.
    if (multiple && dt.items && dt.items.length) {
      const entries = Array.from(dt.items)
        .map((it) => (it.webkitGetAsEntry ? it.webkitGetAsEntry() : null))
        .filter(Boolean);
      if (entries.length) {
        const out = [];
        await Promise.all(entries.map((en) => readEntry(en, out)));
        const files = accept ? out.filter((f) => isAcceptedFile(f, accept)) : out;
        if (files.length) onFiles(files);
        return;
      }
    }

    if (dt.files && dt.files.length) {
      const files = accept ? Array.from(dt.files).filter((f) => isAcceptedFile(f, accept)) : Array.from(dt.files);
      if (files.length) onFiles(files);
    }
  }, [onFiles, multiple, accept]);

  const cls = ["dz"];
  if (compact) cls.push("dz--compact");
  if (over) cls.push("is-over");
  if (filled) cls.push("is-filled");

  return (
    <button
      type="button"
      className={cls.join(" ")}
      onClick={() => inputRef.current && inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <span className="dz__icon" aria-hidden="true">{filled ? "✓" : icon}</span>
      <span className="dz__body">
        <span className="dz__title">{filled ? filledLabel : title}</span>
        {!compact && hint && <span className="dz__hint">{hint}</span>}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={coarse ? undefined : accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          if (e.target.files && e.target.files.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </button>
  );
}

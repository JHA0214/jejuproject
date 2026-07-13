/* ==========================================================================
   워킹라이프 — 유튜브 링크 → 영상 ID / 썸네일 URL
   ========================================================================== */

export function youtubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?[^ ]*v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  // 순수 ID만 입력한 경우
  if (/^[\w-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

export function thumbUrl(url) {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

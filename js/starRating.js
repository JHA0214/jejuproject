/* ==========================================================================
   워킹라이프 — 난이도 별점 그래픽 (1.0~5.0, 0.5 단위)
   회색 배경 별 위에 채워진 별을 % 너비로 겹쳐서 반쪽 별까지 표현
   ========================================================================== */

import { esc } from "./utils.js";

export function starRatingHtml(value, extraClass) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return `<div class="star-rating${extraClass ? " " + extraClass : ""}" role="img" aria-label="난이도 5점 만점에 ${esc(value)}점">
      <div class="star-rating-bg">★★★★★</div>
      <div class="star-rating-fg" style="width:${pct}%">★★★★★</div>
    </div>`;
}

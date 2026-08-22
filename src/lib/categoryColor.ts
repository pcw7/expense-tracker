// 카테고리 차트 색상 결정 로직. dataviz 스킬의 검증된 범주형 팔레트
// (`.dv-root`의 --dv-series-* 토큰, src/app/dataviz.css)를 기본값으로 쓰고,
// 사용자가 카테고리에 지정한 유효한 hex 색상이 있으면 그걸 우선한다.

export const CATEGORY_SERIES_VARS = [
  "var(--dv-series-1)",
  "var(--dv-series-2)",
  "var(--dv-series-3)",
  "var(--dv-series-4)",
  "var(--dv-series-5)",
  "var(--dv-series-6)",
  "var(--dv-series-7)",
];

export const CATEGORY_OTHER_COLOR = "var(--dv-series-other)";

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

/** index는 팔레트 내 순서(0부터), customColor는 카테고리에 저장된 사용자 지정 색상. */
export function resolveCategoryColor(
  customColor: string | null | undefined,
  index: number,
): string {
  if (customColor && HEX_COLOR.test(customColor)) return customColor;
  return CATEGORY_SERIES_VARS[index % CATEGORY_SERIES_VARS.length];
}

"use client";

// TOAST UI Chart의 Heatmap으로 "이번 달 날짜별 지출" 을 요일×주차 그리드로
// 보여준다. 상시 브라우저 API(window/document)를 쓰는 라이브러리라 정적
// import 대신 useEffect 안에서 동적 import해서, 클라이언트에서만(SSR 중에는
// 절대) 로드/생성되도록 한다.
import { useEffect, useRef } from "react";
import { buildMonthWeeks } from "@/lib/date";
import { formatKRW } from "../_lib/format";
import "@toast-ui/chart/toastui-chart.css";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 히트맵 셀은 항상 불투명 단색으로만 칠해진다(라이브러리가 셀 색을 RGB로만
// 보간하고 알파는 지원하지 않음). 카드 배경이 반투명(bg-white/55 + blur)이면
// 위치마다 실제로 비치는 색이 미묘하게 달라져서, 캔버스에 그 중 한 지점에서
// 찍은 값을 칠해도 다른 위치에선 여전히 어긋나 보인다. 그래서 카드 자체를
// 아래 start와 정확히 같은 불투명 단색으로 칠해서(순백/순검정인 --dv-surface
// 대신, 하늘색 톤이 도는 파스텔 블루) "0원 칸 색 == 카드 배경색"이 항상
// 정확히 성립하면서도 하늘색 테마와 자연스럽게 어울리게 한다.
const SCALE = {
  light: { start: "#e8f5ff", end: "#184f95", label: "#52514e" },
  dark: { start: "#161b32", end: "#5598e7", label: "#c3c2b7" },
};

const CHART_HEIGHT = 220;

// 라이브러리 타입이 UMD 네임스페이스 안에 있어 모듈로 직접 import할 수 없어서,
// formatter/template에서 실제로 쓰는 필드만 최소로 타입을 준다.
type TooltipDataInfo = { label?: string };
type TooltipModel = { data: { formattedValue?: string }[] };
type TooltipTheme = {
  borderColor: string;
  borderWidth: number;
  background: string;
  borderRadius: number;
  borderStyle: string;
};

export function SpendingHeatmap({
  month,
  weeks,
}: {
  month: string;
  weeks: (number | null)[][];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const maxAmount = Math.max(0, ...weeks.flat().filter((v): v is number => v !== null));

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chart: any = null;

    const mode: "light" | "dark" = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches
      ? "dark"
      : "light";
    const { start, end, label } = SCALE[mode];

    // 1주가 화면 맨 아래에 오도록(달력을 위→아래로 읽는 방향과 반대) 행 순서를
    // 뒤집는다 - "지출 히트맵이면 아래가 1주차"라는 요청에 맞춘 것.
    const reversedWeeks = [...weeks].reverse();
    const weekCount = weeks.length;

    // 툴팁에 "8월 30일 목요일"처럼 실제 날짜를 보여주려면 각 칸이 며칠인지
    // 알아야 하는데, weeks(금액)엔 그 정보가 없다. buildMonthWeeks가 순수
    // 날짜 계산 함수라 여기서 그대로 다시 불러 같은 모양의 날짜 그리드를
    // 만들고, weeks와 동일하게 뒤집어서 인덱스가 맞물리게 한다.
    const [year, monthNum] = month.split("-").map(Number);
    const dayWeeks = buildMonthWeeks(year, monthNum - 1);
    const reversedDayWeeks = [...dayWeeks].reverse();

    import("@toast-ui/chart/heatmap").then(({ default: HeatmapChart }) => {
      if (disposed || !containerRef.current) return;

      const series = reversedWeeks.map((week) => week.map((amount) => amount ?? 0));
      const yCategories = reversedWeeks.map((_, i) => `${weekCount - i}주`);

      chart = new HeatmapChart({
        el: containerRef.current,
        data: {
          categories: { x: WEEKDAY_LABELS, y: yCategories },
          series,
        },
        options: {
          usageStatistics: false,
          chart: { height: CHART_HEIGHT },
          theme: {
            // chart 배경은 투명하게 둬서 카드의 반투명 유리 느낌이 그대로
            // 비치게 하고, "흰색"은 실제 0원인 칸(series)에만 칠한다 - 여기를
            // start색으로 채우면 그리드 전체(여백 포함)가 통짜 흰 박스가 된다.
            chart: { backgroundColor: "transparent" },
            series: { startColor: start, endColor: end },
            xAxis: { label: { color: label } },
            yAxis: { label: { color: label } },
          },
          // 기본 스펙트럼 범례는 위쪽이 0, 아래쪽이 최댓값이라 "돈은 아래가
          // 0부터"라는 감각과 반대라 끄고, 아래에 직접 만든 세로 범례를 쓴다.
          legend: { visible: false },
          exportMenu: { visible: false },
          tooltip: {
            // 기본 헤더는 "목, 4주"처럼 요일/주차로만 나온다. 라이브러리가
            // 셀마다 만들어주는 label이 정확히 이 "요일, N주" 형식이라는 걸
            // 소스에서 확인했으므로, 그걸 파싱해 실제 날짜로 바꿔 보여준다.
            formatter: (value: number, tooltipDataInfo?: TooltipDataInfo) => {
              const parsed = /^(.+),\s*(\d+)주$/.exec(tooltipDataInfo?.label ?? "");
              if (!parsed) return formatKRW(value);

              const [, weekdayLabel, weekNumStr] = parsed;
              const weekdayIndex = WEEKDAY_LABELS.indexOf(weekdayLabel);
              const rowIndex = weekCount - Number(weekNumStr);
              const day = reversedDayWeeks[rowIndex]?.[weekdayIndex];
              if (day == null || weekdayIndex === -1) return formatKRW(value);

              return `${monthNum}월 ${day}일 ${weekdayLabel}요일 · ${formatKRW(value)}`;
            },
            // 히트맵 기본 템플릿은 "요일, N주" 헤더 줄을 formatter와 무관하게
            // 항상 같이 그린다. formatter 결과(formattedValue)만 쓰는 템플릿을
            // 직접 그려서 그 줄을 없앤다.
            template: (model: TooltipModel, _default: unknown, theme: TooltipTheme) => {
              const { borderColor, borderWidth, background, borderRadius, borderStyle } = theme;
              const style = `border:${borderWidth}px ${borderStyle} ${borderColor};border-radius:${borderRadius}px;background:${background};`;
              const body = model.data
                .map(
                  ({ formattedValue }) => `
                <div class="toastui-chart-tooltip-series-wrapper">
                  <div class="toastui-chart-tooltip-series">
                    <span class="toastui-chart-series-value">${formattedValue}</span>
                  </div>
                </div>`,
                )
                .join("");
              return `<div class="toastui-chart-tooltip" style="${style}">${body}</div>`;
            },
          },
        },
      });
    });

    return () => {
      disposed = true;
      chart?.destroy();
    };
  }, [weeks, month]);

  return (
    <div className="flex items-stretch gap-4 rounded-2xl border border-sky-900/12 bg-[#e8f5ff] p-4 dark:border-indigo-200/15 dark:bg-[#161b32]">
      <div ref={containerRef} className="min-w-0 flex-1" />
      <div
        className="flex shrink-0 flex-col items-center justify-between text-xs"
        style={{ height: CHART_HEIGHT, color: "var(--dv-text-muted)" }}
      >
        <span className="tabular-nums">{formatKRW(maxAmount)}</span>
        <div
          aria-hidden="true"
          className="w-3 flex-1 rounded-full border border-black/10 bg-gradient-to-t from-[#e8f5ff] to-[#184f95] dark:border-white/10 dark:from-[#161b32] dark:to-[#5598e7]"
        />
        <span>0원</span>
      </div>
    </div>
  );
}

"use client";

// TOAST UI Chart의 Heatmap으로 "이번 달 날짜별 지출" 을 요일×주차 그리드로
// 보여준다. 상시 브라우저 API(window/document)를 쓰는 라이브러리라 정적
// import 대신 useEffect 안에서 동적 import해서, 클라이언트에서만(SSR 중에는
// 절대) 로드/생성되도록 한다.
import { useEffect, useRef } from "react";
import { formatKRW } from "../_lib/format";
import "@toast-ui/chart/toastui-chart.css";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 히트맵 셀은 항상 불투명 단색으로만 칠해진다(라이브러리가 셀 색을 RGB로만
// 보간하고 알파는 지원하지 않아, 카드를 투명하게 둬도 0원 칸만 "안 보이게"
// 할 수는 없음). 그래서 순백/순검정 대신, 카드의 실제 렌더링 색(반투명 유리
// 위로 하늘색이 비치는 합성색)을 스크린샷에서 직접 스포이트로 찍어 그 값을
// 썼다 - 카드 배경과 훨씬 자연스럽게 이어진다.
const SCALE = {
  light: { start: "#e8f5ff", end: "#184f95", label: "#52514e" },
  dark: { start: "#161b32", end: "#5598e7", label: "#c3c2b7" },
};

const CHART_HEIGHT = 220;

export function SpendingHeatmap({ weeks }: { weeks: (number | null)[][] }) {
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
            formatter: (value: number) => formatKRW(value),
          },
        },
      });
    });

    return () => {
      disposed = true;
      chart?.destroy();
    };
  }, [weeks]);

  return (
    <div className="flex items-stretch gap-4 rounded-2xl border border-sky-900/12 bg-white/55 p-4 backdrop-blur-md dark:border-indigo-200/15 dark:bg-white/5">
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

"use client";

// TOAST UI Chart의 Heatmap으로 "이번 달 날짜별 지출" 을 요일×주차 그리드로
// 보여준다. 상시 브라우저 API(window/document)를 쓰는 라이브러리라 정적
// import 대신 useEffect 안에서 동적 import해서, 클라이언트에서만(SSR 중에는
// 절대) 로드/생성되도록 한다.
import { useEffect, useRef } from "react";
import { formatKRW } from "../_lib/format";
import "@toast-ui/chart/toastui-chart.css";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// dataviz 스킬의 단일 hue(blue) 시퀀셜 램프에서 뽑은 두 색. 라이트는 문서화된
// step100/600, 다크는 --dv-series-1 다크 스텝과 어울리는 더 밝은 톤으로 맞췄다
// (표면색에 가까운 값에서 시작해 값이 커질수록 진해지는 시퀀셜 인코딩).
const SCALE = {
  light: { start: "#cde2fb", end: "#184f95", label: "#52514e" },
  dark: { start: "#182338", end: "#5598e7", label: "#c3c2b7" },
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
    <div className="flex items-stretch gap-4">
      <div ref={containerRef} className="min-w-0 flex-1" />
      <div
        className="flex shrink-0 flex-col items-center justify-between text-xs"
        style={{ height: CHART_HEIGHT, color: "var(--dv-text-muted)" }}
      >
        <span className="tabular-nums">{formatKRW(maxAmount)}</span>
        <div
          aria-hidden="true"
          className="w-3 flex-1 rounded-full bg-gradient-to-t from-[#cde2fb] to-[#184f95] dark:from-[#182338] dark:to-[#5598e7]"
        />
        <span>0원</span>
      </div>
    </div>
  );
}

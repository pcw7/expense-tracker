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

export function SpendingHeatmap({ weeks }: { weeks: (number | null)[][] }) {
  const containerRef = useRef<HTMLDivElement>(null);

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

    import("@toast-ui/chart/heatmap").then(({ default: HeatmapChart }) => {
      if (disposed || !containerRef.current) return;

      const series = weeks.map((week) => week.map((amount) => amount ?? 0));
      const yCategories = weeks.map((_, i) => `${i + 1}주`);

      chart = new HeatmapChart({
        el: containerRef.current,
        data: {
          categories: { x: WEEKDAY_LABELS, y: yCategories },
          series,
        },
        options: {
          usageStatistics: false,
          chart: { height: 220 },
          theme: {
            chart: { backgroundColor: "transparent" },
            series: { startColor: start, endColor: end },
            xAxis: { label: { color: label } },
            yAxis: { label: { color: label } },
            legend: { label: { color: label } },
          },
          legend: { align: "right" },
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

  return <div ref={containerRef} className="w-full" />;
}

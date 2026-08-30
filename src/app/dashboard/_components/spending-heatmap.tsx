"use client";

// TOAST UI Chart의 Heatmap으로 "이번 달 날짜별 지출" 을 요일×주차 그리드로
// 보여준다. 상시 브라우저 API(window/document)를 쓰는 라이브러리라 정적
// import 대신 useEffect 안에서 동적 import해서, 클라이언트에서만(SSR 중에는
// 절대) 로드/생성되도록 한다.
import { useEffect, useRef } from "react";
import { formatKRW } from "../_lib/format";
import "@toast-ui/chart/toastui-chart.css";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 대시보드 배경은 하늘색 그라디언트라 캔버스에 --dv-surface(불투명 흰/검정)를
// 그대로 칠하면 그 위에 떠 있는 흰 상자처럼 보인다. 그래서 히트맵을 홈 화면과
// 같은 반투명 유리 카드(bg-white/55 backdrop-blur) 안에 넣고, 0원 칸은 카드의
// 흰 배경과 같은 완전 불투명 흰색/검정으로 시작해 카드 안에서만 "티가 안 나게"
// 만든다 - 카드 밖 하늘색과는 애초에 안 맞닿으므로 어색해 보이지 않는다.
const SCALE = {
  light: { start: "#ffffff", end: "#184f95", label: "#52514e" },
  dark: { start: "#141414", end: "#5598e7", label: "#c3c2b7" },
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
            chart: { backgroundColor: start },
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
          className="w-3 flex-1 rounded-full border border-black/10 bg-gradient-to-t from-white to-[#184f95] dark:border-white/10 dark:from-[#141414] dark:to-[#5598e7]"
        />
        <span>0원</span>
      </div>
    </div>
  );
}

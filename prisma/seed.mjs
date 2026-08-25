// 카테고리는 더 이상 앱 안에서 직접 추가할 수 없는 고정 프리셋이라, 새로
// 마이그레이션한 DB에는 이 12개가 항상 존재해야 한다. 이미 있는 이름은
// 건너뛰므로 여러 번 실행해도 안전하다(idempotent). 색상은 카테고리별
// 고정 아이덴티티라 차트/배지 어디서나 같은 카테고리는 같은 색으로 보인다.
import "dotenv/config";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

const url = process.env.DATABASE_URL || "file:./prisma/dev.db";
const dbPath = url.replace(/^file:/, "");

// dataviz 스킬(검증된 카테고리 팔레트 방법론)로 골라낸 12색. 인접 배치 시
// OKLab CVD(색각이상) ΔE와 일반 시야 ΔE 모두 목표치를 통과하도록 색상환에서
// 11개 유채색을 고르고 순서를 탐색했고(색상별 계산 스크립트로 검증, 눈대중 아님),
// "기타"는 범주형 색 경쟁에 넣지 않고 기존 --dv-series-other와 동일한
// 중성 회색으로 고정했다(무엇에도 안 걸리는 "미분류"라는 의미와도 맞음).
const CATEGORIES = [
  { name: "식비", icon: "🍚", color: "#ce5342" },
  { name: "주거", icon: "🏠", color: "#1d8fb8" },
  { name: "교통", icon: "🚇", color: "#4e7bdf" },
  { name: "통신·구독", icon: "📱", color: "#8769d5" },
  { name: "쇼핑", icon: "🛒", color: "#b357ad" },
  { name: "패션·미용", icon: "👕", color: "#21a592" },
  { name: "건강", icon: "🏥", color: "#1d9769" },
  { name: "여가·취미", icon: "🎮", color: "#5b9219" },
  { name: "모임·경조사", icon: "🤝", color: "#c94f7c" },
  { name: "금융", icon: "💰", color: "#b26f18" },
  { name: "교육", icon: "📚", color: "#957f18" },
  { name: "기타", icon: "🏷️", color: "#898781" },
];

const db = new Database(dbPath);
const insert = db.prepare(
  "INSERT INTO categories (id, name, color, icon, createdAt) VALUES (?, ?, ?, ?, ?)",
);
const now = new Date().toISOString();

const existingNames = new Set(
  db.prepare("SELECT name FROM categories").all().map((row) => row.name),
);

let created = 0;
for (const category of CATEGORIES) {
  if (existingNames.has(category.name)) continue;
  insert.run(randomUUID(), category.name, category.color, category.icon, now);
  created += 1;
}

console.log(
  `Seeded ${created} categor${created === 1 ? "y" : "ies"} (${CATEGORIES.length - created} already existed).`,
);
db.close();

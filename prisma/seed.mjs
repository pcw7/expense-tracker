// 카테고리는 더 이상 앱 안에서 직접 추가할 수 없는 고정 프리셋이라, 새로
// 마이그레이션한 DB에는 이 12개가 항상 존재해야 한다. 이미 있는 이름은
// 건너뛰므로 여러 번 실행해도 안전하다(idempotent). 색상은 카테고리별
// 고정 아이덴티티라 차트/배지 어디서나 같은 카테고리는 같은 색으로 보인다.
import "dotenv/config";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

const url = process.env.DATABASE_URL || "file:./prisma/dev.db";
const dbPath = url.replace(/^file:/, "");

const CATEGORIES = [
  { name: "식비", icon: "🍚", color: "#f97316" },
  { name: "주거", icon: "🏠", color: "#2563eb" },
  { name: "교통", icon: "🚇", color: "#0ea5e9" },
  { name: "통신·구독", icon: "📱", color: "#7c3aed" },
  { name: "쇼핑", icon: "🛒", color: "#ec4899" },
  { name: "패션·미용", icon: "👕", color: "#db2777" },
  { name: "건강", icon: "🏥", color: "#16a34a" },
  { name: "여가·취미", icon: "🎮", color: "#eab308" },
  { name: "모임·경조사", icon: "🤝", color: "#f59e0b" },
  { name: "금융", icon: "💰", color: "#059669" },
  { name: "교육", icon: "📚", color: "#4f46e5" },
  { name: "기타", icon: "🏷️", color: "#78716c" },
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

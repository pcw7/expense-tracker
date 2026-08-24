// 카테고리는 더 이상 앱 안에서 직접 추가할 수 없는 고정 프리셋이라, 새로
// 마이그레이션한 DB에는 이 12개가 항상 존재해야 한다. 이미 있는 이름은
// 건너뛰므로 여러 번 실행해도 안전하다(idempotent).
import "dotenv/config";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

const url = process.env.DATABASE_URL || "file:./prisma/dev.db";
const dbPath = url.replace(/^file:/, "");

const CATEGORIES = [
  { name: "식비", icon: "🍚" },
  { name: "주거", icon: "🏠" },
  { name: "교통", icon: "🚇" },
  { name: "통신·구독", icon: "📱" },
  { name: "쇼핑", icon: "🛒" },
  { name: "패션·미용", icon: "👕" },
  { name: "건강", icon: "🏥" },
  { name: "여가·취미", icon: "🎮" },
  { name: "모임·경조사", icon: "🤝" },
  { name: "금융", icon: "💰" },
  { name: "교육", icon: "📚" },
  { name: "기타", icon: null },
];

const db = new Database(dbPath);
const insert = db.prepare(
  "INSERT INTO categories (id, name, color, icon, createdAt) VALUES (?, ?, NULL, ?, ?)",
);
const now = new Date().toISOString();

const existingNames = new Set(
  db.prepare("SELECT name FROM categories").all().map((row) => row.name),
);

let created = 0;
for (const category of CATEGORIES) {
  if (existingNames.has(category.name)) continue;
  insert.run(randomUUID(), category.name, category.icon, now);
  created += 1;
}

console.log(
  `Seeded ${created} categor${created === 1 ? "y" : "ies"} (${CATEGORIES.length - created} already existed).`,
);
db.close();

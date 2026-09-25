import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:esibp-%2BE%3DFM-Xp7@db.swsdqhqmuqbhyykiymif.supabase.co:5432/postgres",
  },
  verbose: true,
});

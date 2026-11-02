import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString);
const db = drizzle(sql, { schema });

async function main() {
  try {
    const users = await db.query.users.findMany({ with: { profile: true } });
    console.log(JSON.stringify(users, null, 2));
    await sql.end();
    process.exit(0);
  } catch (e: any) {
    console.error(e.message);
    await sql.end();
    process.exit(1);
  }
}

main();

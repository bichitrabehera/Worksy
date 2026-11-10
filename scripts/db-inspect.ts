import "dotenv/config";
import { prisma } from "../lib/prisma";

type ColumnRow = {
  column_name: string;
  is_nullable: string;
  data_type: string;
};

type TableRow = { table_name: string };
type CountRow = { c: number };

async function main() {
  const columns = await prisma.$queryRawUnsafe<ColumnRow[]>(
    `SELECT column_name, is_nullable, data_type
     FROM information_schema.columns
     WHERE table_name = 'jobs'
     ORDER BY ordinal_position`,
  );
  console.log("jobs columns:");
  for (const column of columns) {
    console.log(
      `  ${column.column_name.padEnd(24)} nullable=${column.is_nullable}  ${column.data_type}`,
    );
  }

  const tables = await prisma.$queryRawUnsafe<TableRow[]>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`,
  );
  console.log("tables:", tables.map((row) => row.table_name).join(", "));

  const jobs = await prisma.$queryRawUnsafe<CountRow[]>(
    `SELECT count(*)::int AS c FROM jobs`,
  );
  console.log("jobs rows:", jobs[0].c);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

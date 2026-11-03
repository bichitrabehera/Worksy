import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/prisma/generated/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

const prismaConnectionUrl = new URL(databaseUrl);
// The pg adapter does not support Neon's required channel-binding option.
prismaConnectionUrl.searchParams.delete("channel_binding");

const adapter = new PrismaPg({
  connectionString: prismaConnectionUrl.toString(),
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

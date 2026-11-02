import { pgTable, text, timestamp, uuid, integer, boolean, jsonb, varchar, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  authProvider: varchar("auth_provider", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  degree: varchar("degree", { length: 255 }),
  major: varchar("major", { length: 255 }),
  graduationYear: integer("graduation_year"),
  college: varchar("college", { length: 255 }),
  skills: jsonb("skills").$type<string[]>().default([]),
  projects: jsonb("projects").$type<Array<{ name: string; description: string; tech_stack: string[] }>>().default([]),
  preferredRoles: jsonb("preferred_roles").$type<string[]>().default([]),
  locationPreference: varchar("location_preference", { length: 50 }),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  companyTypePreference: jsonb("company_type_preference").$type<string[]>().default([]),
  industryPreference: jsonb("industry_preference").$type<string[]>().default([]),
  jobTypePreference: jsonb("job_type_preference").$type<string[]>().default(["Full-time"]),
  availability: varchar("availability", { length: 50 }),
  resumeUrl: text("resume_url"),
  resumeParsedAt: timestamp("resume_parsed_at"),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: varchar("source", { length: 50 }).notNull(),
  sourceJobId: varchar("source_job_id", { length: 255 }).notNull(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  companyNormalized: varchar("company_normalized", { length: 255 }).notNull(),
  location: jsonb("location").$type<string[]>().notNull(),
  locationNormalized: jsonb("location_normalized").$type<string[]>().notNull(),
  description: text("description").notNull(),
  requirements: text("requirements"),
  jobType: varchar("job_type", { length: 50 }),
  workMode: varchar("work_mode", { length: 50 }),
  experienceRequired: varchar("experience_required", { length: 100 }),
  salaryRange: varchar("salary_range", { length: 100 }),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  applyUrl: text("apply_url").notNull(),
  applyUrlNormalized: text("apply_url_normalized").notNull(),
  postedDate: timestamp("posted_date"),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true).notNull(),
  dedupKey: varchar("dedup_key", { length: 512 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const jobMatches = pgTable("job_matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  matchScore: integer("match_score").notNull(),
  scoreBreakdown: jsonb("score_breakdown").$type<any>(),
  matchReasons: jsonb("match_reasons").$type<string[]>().default([]),
  viewed: boolean("viewed").default(false),
  viewedAt: timestamp("viewed_at"),
  clicked: boolean("clicked").default(false),
  clickedAt: timestamp("clicked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userJobStatus = pgTable("user_job_status", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).notNull(),
  notes: text("notes"),
  statusChangedAt: timestamp("status_changed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.userId, table.jobId),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles),
  jobMatches: many(jobMatches),
  jobStatuses: many(userJobStatus),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export const jobsRelations = relations(jobs, ({ many }) => ({
  jobMatches: many(jobMatches),
  jobStatuses: many(userJobStatus),
}));

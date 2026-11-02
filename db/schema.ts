import { pgTable, text, timestamp, uuid, integer, boolean, jsonb, varchar, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: varchar("clerk_id", { length: 255 }).unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  imageUrl: text("image_url"),
  authProvider: varchar("auth_provider", { length: 50 }).default("google"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  // Basic Profile
  fullName: varchar("full_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 50 }),
  currentLocation: varchar("current_location", { length: 255 }),
  college: varchar("college", { length: 255 }),
  university: varchar("university", { length: 255 }),
  degree: varchar("degree", { length: 255 }),
  fieldOfStudy: varchar("field_of_study", { length: 255 }),
  major: varchar("major", { length: 255 }),
  graduationYear: integer("graduation_year"),
  experienceLevel: varchar("experience_level", { length: 50 }), // Fresher, Internship Experience, Experienced
  skills: jsonb("skills").$type<string[]>().default([]),
  resumeUrl: text("resume_url"),
  // Job Preferences
  desiredJobRoles: jsonb("desired_job_roles").$type<string[]>().default([]),
  preferredRoles: jsonb("preferred_roles").$type<string[]>().default([]),
  jobTypes: jsonb("job_types").$type<string[]>().default([]), // Internship, Full-time, Part-time, Contract, Freelance
  jobTypePreference: jsonb("job_type_preference").$type<string[]>().default(["Full-time"]),
  preferredLocations: jsonb("preferred_locations").$type<string[]>().default([]),
  locationPreference: varchar("location_preference", { length: 50 }),
  workMode: jsonb("work_mode").$type<string[]>().default([]), // Remote, Hybrid, On-site
  expectedSalaryMin: integer("expected_salary_min"),
  expectedSalaryMax: integer("expected_salary_max"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  preferredExperienceLevel: varchar("preferred_experience_level", { length: 50 }),
  companyTypePreference: jsonb("company_type_preference").$type<string[]>().default([]),
  industryPreference: jsonb("industry_preference").$type<string[]>().default([]),
  availability: varchar("availability", { length: 50 }),
  projects: jsonb("projects").$type<Array<{ name: string; description: string; tech_stack: string[] }>>().default([]),
  resumeParsedAt: timestamp("resume_parsed_at"),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  onboardingStep: integer("onboarding_step").default(0),
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
  status: varchar("status", { length: 50 }).notNull(), // Saved, Applied, Viewed, Redirected, Interviewing, Offer, Rejected, Closed
  notes: text("notes"),
  statusChangedAt: timestamp("status_changed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.userId, table.jobId),
}));

export const savedJobs = pgTable("saved_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.userId, table.jobId),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles),
  jobMatches: many(jobMatches),
  jobStatuses: many(userJobStatus),
  savedJobs: many(savedJobs),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export const jobsRelations = relations(jobs, ({ many }) => ({
  jobMatches: many(jobMatches),
  jobStatuses: many(userJobStatus),
  savedBy: many(savedJobs),
}));

export const savedJobsRelations = relations(savedJobs, ({ one }) => ({
  user: one(users, { fields: [savedJobs.userId], references: [users.id] }),
  job: one(jobs, { fields: [savedJobs.jobId], references: [jobs.id] }),
}));

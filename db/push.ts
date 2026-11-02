import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const connectionString = process.env.DATABASE_URL!;

async function main() {
  try {
    console.log("Connecting to database...");
    const sql = postgres(connectionString, { max: 1 });
    const db = drizzle(sql, { schema });
    
    console.log("Pushing schema...");
    // Use raw SQL to create tables
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clerk_id VARCHAR(255) UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        image_url TEXT,
        auth_provider VARCHAR(50) DEFAULT 'google',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        full_name VARCHAR(255),
        email VARCHAR(255),
        phone_number VARCHAR(50),
        current_location VARCHAR(255),
        college VARCHAR(255),
        university VARCHAR(255),
        degree VARCHAR(255),
        field_of_study VARCHAR(255),
        major VARCHAR(255),
        graduation_year INTEGER,
        experience_level VARCHAR(50),
        skills JSONB DEFAULT '[]'::jsonb,
        resume_url TEXT,
        desired_job_roles JSONB DEFAULT '[]'::jsonb,
        preferred_roles JSONB DEFAULT '[]'::jsonb,
        job_types JSONB DEFAULT '[]'::jsonb,
        job_type_preference JSONB DEFAULT '["Full-time"]'::jsonb,
        preferred_locations JSONB DEFAULT '[]'::jsonb,
        location_preference VARCHAR(50),
        work_mode JSONB DEFAULT '[]'::jsonb,
        expected_salary_min INTEGER,
        expected_salary_max INTEGER,
        salary_min INTEGER,
        salary_max INTEGER,
        preferred_experience_level VARCHAR(50),
        company_type_preference JSONB DEFAULT '[]'::jsonb,
        industry_preference JSONB DEFAULT '[]'::jsonb,
        availability VARCHAR(50),
        projects JSONB DEFAULT '[]'::jsonb,
        resume_parsed_at TIMESTAMP,
        onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL,
        onboarding_step INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source VARCHAR(50) NOT NULL,
        source_job_id VARCHAR(255) NOT NULL,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        company_normalized VARCHAR(255) NOT NULL,
        location JSONB NOT NULL,
        location_normalized JSONB NOT NULL,
        description TEXT NOT NULL,
        requirements TEXT,
        job_type VARCHAR(50),
        work_mode VARCHAR(50),
        experience_required VARCHAR(100),
        salary_range VARCHAR(100),
        salary_min INTEGER,
        salary_max INTEGER,
        apply_url TEXT NOT NULL,
        apply_url_normalized TEXT NOT NULL,
        posted_date TIMESTAMP,
        fetched_at TIMESTAMP DEFAULT NOW() NOT NULL,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        dedup_key VARCHAR(512) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS job_matches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        match_score INTEGER NOT NULL,
        score_breakdown JSONB,
        match_reasons JSONB DEFAULT '[]'::jsonb,
        viewed BOOLEAN DEFAULT FALSE,
        viewed_at TIMESTAMP,
        clicked BOOLEAN DEFAULT FALSE,
        clicked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS user_job_status (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        notes TEXT,
        status_changed_at TIMESTAMP DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(user_id, job_id)
      );
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS saved_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(user_id, job_id)
      );
    `;
    
    console.log("Schema pushed successfully!");
    await sql.end();
    process.exit(0);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}

main();

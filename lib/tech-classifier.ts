import type { Job } from "./types";

// Vertical filter: keeps only tech roles so non-tech listings (nursing, sales,
// legal, ...) never reach the database in the first place. Provider-side
// filters (Remotive ?category=software-dev, Jobicy ?industry=engineering)
// narrow most of the feed already; this classifier is the second line of
// defense for boards that return mixed verticals (Himalayas, Remote OK tags).
//
// Rule: a job is tech when its title matches a tech pattern, or its provider
// tags contain a known tech tag. Everything else is dropped. False negatives
// (an odd tech title that matches no pattern) are harmless because other
// boards carry the same role; false positives were the complaint. The ingest
// script logs a sample of dropped titles per provider to make tuning easy.

const TECH_TITLE_PATTERNS: RegExp[] = [
  // Core development roles.
  /\b(software|web|full[-\s]?stack|fullstack|front[-\s]?end|back[-\s]?end|backend|frontend)\s*(developer|engineer|development|programmer)\b/i,
  /\b(developer|programmer)\b/i,
  /\b(software|computer|web|application)\s+engineer\b/i,
  // Infrastructure, operations and reliability.
  /\b(devops|dev ops|sre|site reliability|platform engineer|infrastructure engineer|cloud engineer|systems? engineer|network engineer|security engineer|cyber ?security|penetration tester|ethical hacker|information security)\b/i,
  /\b(devops|sre|sysadmin|system administrator|systems administrator|site reliability)\b/i,
  // Data and ML.
  /\b(data (scientist|analyst|engineer|architect)|ml engineer|machine learning engineer|ai engineer|artificial intelligence engineer|analytics engineer|business intelligence developer|database (administrator|engineer)|dba)\b/i,
  // QA and testing.
  /\b(qa|quality assurance|test engineer|automation (tester|engineer)|sdet|performance engineer)\b/i,
  // Mobile and specialized stacks.
  /\b(android|ios|flutter|react native|mobile) (developer|engineer)\b/i,
  /\b(embedded|firmware) (developer|engineer)\b/i,
  // Tech leadership and architect roles.
  /\b(tech(nical)? lead|software architect|solutions? architect|engineering manager|head of (engineering|software|technology|data|it|dev(elopment)?)|director of engineering|vp of engineering|cto|chief technology officer)\b/i,
  // IT and technical support.
  /\b(it (support|specialist|technician|administrator|engineer)|technical support|support engineer|helpdesk|desktop support|service desk)\b/i,
  // Tech-adjacent roles commonly hired at tech companies.
  /\b(technical writer|developer advocate|devrel|developer relations|solutions engineer|technical (consultant|program manager|project manager|manager)|member of technical staff)\b/i,
  // Seniority-qualified engineer titles common on remote boards.
  /\b(staff|principal|distinguished|integrations?|forward deployed|implementation|prompt)\s+engineer\b/i,
  /\b(engineering manager|director,? engineering|engineering director)\b/i,
  /\bgrowth engineer\b/i,
  // Testing roles beyond "test engineer".
  /\b(software|qa|manual|automation|performance) tester\b/i,
  // Language-specific titles that skip the generic words above.
  /\b(python|java|javascript|typescript|node(\.?js)?|golang|ruby|php|laravel|django|rust|kotlin|swift|c\+\+|c#|\.net|dotnet)\s+(developer|engineer)\b/i,
];

// Remote OK exposes provider tags through Job.jobType; Himalayas and Jobicy
// sometimes fill jobType with an employment label, so only exact tag matches
// count. A single solid tech tag marks the job as tech.
const TECH_TAGS = new Set([
  "javascript", "typescript", "python", "java", "golang", "go", "rust",
  "ruby", "php", "laravel", "django", "flask", "node", "nodejs", "node.js",
  "react", "react native", "nextjs", "next.js", "vue", "angular", "svelte",
  "kotlin", "swift", "flutter", "android", "ios", "c++", "c#", ".net",
  "dotnet", "backend", "frontend", "fullstack", "full stack", "devops",
  "aws", "gcp", "azure", "cloud", "kubernetes", "docker", "linux", "terraform",
  "postgresql", "mysql", "mongodb", "redis", "graphql", "machine learning",
  "ai", "ml", "data science", "data engineering", "cybersecurity", "security",
  "qa", "testing", "mobile", "web development", "software development",
  "software engineering", "embedded", "firmware", "sre", "site reliability",
]);

export function isTechJob(job: Pick<Job, "title" | "jobType">): boolean {
  const title = (job.title ?? "").toLowerCase();

  if (TECH_TITLE_PATTERNS.some((pattern) => pattern.test(title))) {
    return true;
  }

  const tags = (job.jobType ?? "").toLowerCase();

  if (tags.split(/[,|]/).some((tag) => TECH_TAGS.has(tag.trim()))) {
    return true;
  }

  return false;
}

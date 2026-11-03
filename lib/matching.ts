import type { Job } from "./types";

export type JobPreferences = {
  desiredJobRoles?: unknown;
  preferredRoles?: unknown;
  skills?: unknown;
  preferredLocations?: unknown;
  workMode?: unknown;
  jobTypes?: unknown;
  jobTypePreference?: unknown;
  preferredExperienceLevel?: unknown;
  experienceLevel?: unknown;
};

export type JobMatch = {
  score: number;
  category: "Excellent Match" | "Good Match" | "Potential Match" | "Lower Match";
  reasons: string[];
  breakdown: {
    roles: number;
    skills: number;
    location: number;
    workMode: number;
    jobType: number;
    experience: number;
  };
};

const WEIGHTS = {
  roles: 30,
  skills: 25,
  location: 15,
  workMode: 10,
  jobType: 10,
  experience: 10,
} as const;

const ROLE_ALIASES: Record<string, string[]> = {
  "full stack developer": ["software engineer", "frontend developer", "backend developer", "web developer"],
  "frontend developer": ["react developer", "ui developer", "web developer", "software engineer"],
  "backend developer": ["node.js developer", "api developer", "software engineer", "server developer"],
  "software engineer": ["developer", "full stack", "backend", "frontend"],
  "data scientist": ["machine learning engineer", "data analyst", "ai engineer"],
  "machine learning engineer": ["data scientist", "ai engineer", "ai/llm engineer"],
  "ai/llm engineer": ["machine learning engineer", "data scientist", "ai engineer"],
  "devops engineer": ["cloud engineer", "site reliability engineer", "platform engineer"],
  "cloud engineer": ["devops engineer", "site reliability engineer"],
};

const SKILL_ALIASES: Record<string, string[]> = {
  "next.js": ["nextjs", "react"],
  react: ["frontend", "javascript", "typescript"],
  "node.js": ["nodejs", "express.js", "backend", "javascript"],
  "machine learning": ["ml", "tensorflow", "pytorch", "ai"],
  "data science": ["data scientist", "python", "machine learning"],
  postgresql: ["postgres", "sql"],
  javascript: ["js", "typescript", "node.js", "react"],
  typescript: ["javascript", "js", "react", "next.js"],
};

const asStrings = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof value === "string" && value.trim()) return [value];
  return [];
};

const normalize = (value: string) =>
  value.toLowerCase().replace(/[–—]/g, "-").replace(/[^a-z0-9+#.]+/g, " ").trim();

const containsTerm = (text: string, term: string) => {
  const normalizedText = normalize(text);
  const normalizedTerm = normalize(term);
  return normalizedText.includes(normalizedTerm);
};

const roleScore = (roles: string[], job: Job) => {
  if (!roles.length) return 0;
  const title = `${job.title} ${job.description}`;
  let best = 0;
  for (const role of roles) {
    const normalizedRole = normalize(role);
    if (containsTerm(job.title, role)) best = Math.max(best, 100);
    else if ((ROLE_ALIASES[normalizedRole] ?? []).some((alias) => containsTerm(job.title, alias))) {
      best = Math.max(best, 80);
    } else if (containsTerm(title, role)) {
      best = Math.max(best, 60);
    }
  }
  return best;
};

const skillScore = (skills: string[], job: Job) => {
  if (!skills.length) return 0;
  const text = `${job.title} ${job.description} ${job.requirements ?? ""}`;
  const matched = skills.filter((skill) => {
    const terms = [skill, ...(SKILL_ALIASES[normalize(skill)] ?? [])];
    return terms.some((term) => containsTerm(text, term));
  });
  return Math.min(100, (matched.length / skills.length) * 100);
};

const locationScore = (locations: string[], job: Job) => {
  if (!locations.length) return 0;
  const jobLocation = job.location.join(" ");
  if (locations.some((location) => containsTerm(jobLocation, location))) return 100;
  if (job.workMode === "Remote" && /(india|indian|apac|asia|worldwide|global)/i.test(jobLocation)) return 90;
  if (job.workMode === "Remote" && /remote/i.test(jobLocation)) return 45;
  return 0;
};

const workModeScore = (modes: string[], job: Job) => {
  if (!modes.length) return 0;
  const mode = normalize(job.workMode);
  return modes.some((value) => normalize(value) === mode) ? 100 : 0;
};

const jobTypeScore = (types: string[], job: Job) => {
  if (!types.length || !job.jobType) return 0;
  const jobType = normalize(job.jobType);
  if (types.some((type) => normalize(type) === jobType)) return 100;
  if (
    types.some((type) => ["internship", "apprenticeship"].includes(normalize(type))) &&
    /(entry|junior|graduate|trainee|fresher)/i.test(`${job.title} ${job.description}`)
  ) return 70;
  return 0;
};

const experienceScore = (levels: string[], job: Job) => {
  if (!levels.length) return 0;
  const preference = normalize(levels[0]);
  const text = `${job.title} ${job.experienceRequired ?? ""}`.toLowerCase();
  if (/(student|fresher)/.test(preference)) {
    return /(intern|apprentice|graduate|trainee|entry|junior|fresher|0-1|0 years)/i.test(text) ? 100 : 55;
  }
  if (preference.includes("less than 1")) return /(entry|junior|0-1|less than 1|no experience)/i.test(text) ? 100 : 50;
  if (preference.includes("1-2")) return /(junior|associate|1-2|1 year|2 years)/i.test(text) ? 100 : 50;
  if (preference.includes("2-5")) return /(mid|2-5|2 years|3 years|4 years|5 years)/i.test(text) ? 100 : 50;
  if (preference.includes("5+")) return /(senior|lead|principal|5\+|6 years|7 years|8 years)/i.test(text) ? 100 : 50;
  return 0;
};

const categoryFor = (score: number): JobMatch["category"] =>
  score >= 80 ? "Excellent Match" : score >= 60 ? "Good Match" : score >= 40 ? "Potential Match" : "Lower Match";

export function scoreJob(job: Job, profile?: JobPreferences | null): JobMatch {
  const roles = asStrings(profile?.desiredJobRoles ?? profile?.preferredRoles);
  const skills = asStrings(profile?.skills);
  const locations = asStrings(profile?.preferredLocations);
  const modes = asStrings(profile?.workMode);
  const types = asStrings(profile?.jobTypes ?? profile?.jobTypePreference);
  const experience = asStrings(profile?.preferredExperienceLevel ?? profile?.experienceLevel);
  const available = [
    roles.length > 0,
    skills.length > 0,
    locations.length > 0,
    modes.length > 0,
    types.length > 0,
    experience.length > 0,
  ];
  const totalWeight = available.reduce((sum, present, index) =>
    sum + (present ? Object.values(WEIGHTS)[index] : 0), 0);

  const values = {
    roles: roleScore(roles, job),
    skills: skillScore(skills, job),
    location: locationScore(locations, job),
    workMode: workModeScore(modes, job),
    jobType: jobTypeScore(types, job),
    experience: experienceScore(experience, job),
  };
  const weighted = Object.entries(values).reduce((sum, [key, value]) => {
    const weight = WEIGHTS[key as keyof typeof WEIGHTS];
    return sum + (available[Object.keys(WEIGHTS).indexOf(key)] ? value * weight : 0);
  }, 0);
  const score = totalWeight ? Math.round(weighted / totalWeight) : 0;
  const reasons: string[] = [];
  if (values.roles >= 80 && roles[0]) reasons.push(`Matches your ${roles[0]} preference.`);
  if (values.skills > 0) {
    const text = `${job.title} ${job.description} ${job.requirements ?? ""}`;
    const matched = skills.filter((skill) =>
      [skill, ...(SKILL_ALIASES[normalize(skill)] ?? [])].some((term) =>
        containsTerm(text, term),
      ),
    );
    if (matched.length) reasons.push(`Mentions ${matched.slice(0, 3).join(", ")} from your skills.`);
  }
  if (values.location >= 90) reasons.push("Matches your preferred location or India-eligible remote preference.");
  else if (values.workMode === 100) reasons.push(`Uses your preferred ${job.workMode.toLowerCase()} work mode.`);
  if (values.jobType >= 70 && job.jobType) reasons.push(`Offers a relevant ${job.jobType.toLowerCase()} opportunity.`);
  if (values.experience >= 80) reasons.push("Fits your preferred experience level.");
  return { score, category: categoryFor(score), reasons: reasons.slice(0, 4), breakdown: values };
}

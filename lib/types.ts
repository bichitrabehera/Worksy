export type JobSource = "Remotive" | "Himalayas" | "Remote OK" | "Jobicy";

export type Job = {
  id: string;
  title: string;
  company: string;
  companyUrl?: string;
  location: string[];
  description: string;
  requirements?: string;
  jobType?: string;
  workMode: "Remote" | "Hybrid" | "On-site" | "Unknown";
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  url: string;
  source: JobSource;
  postedAt: string;
  experienceRequired?: string;
  match?: {
    score: number;
    category: string;
    reasons: string[];
  };
};

export type JobQuery = {
  q: string;
  where: string;
  remoteOnly: boolean;
  limit: number;
};

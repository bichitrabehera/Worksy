export function isFresherFriendly(job: any) {
  const exp = (job.experienceRequired || "").toLowerCase();
  const desc = (job.description || "").toLowerCase();
  const req = (job.requirements || "").toLowerCase();
  const text = exp + " " + desc + " " + req;
  if (text.includes("senior") || text.includes("lead") || text.includes("3+") || text.includes("4+") || text.includes("5+")) {
    return false;
  }
  if (exp.includes("fresher") || exp.includes("0-1") || exp.includes("entry")) return true;
  if (text.includes("graduate trainee") || text.includes("trainee")) return true;
  if (exp.includes("0 years") || exp.includes("no experience")) return true;
  // default allow for our mock set
  return true;
}

export function scoreJob(job: any, profile: any) {
  let score = 0;
  const reasons: string[] = [];
  
  const userSkills = new Set((profile?.skills || []).map((s: string) => s.toLowerCase()));
  const text = ((job.description || "") + " " + (job.requirements || "")).toLowerCase();
  let skillOverlap = 0;
  for (const s of Array.from(userSkills)) {
    if (text.includes(s as string)) skillOverlap++;
  }
  if (userSkills.size > 0) {
    const skillScore = Math.min(100, (skillOverlap / Math.max(1, userSkills.size)) * 100);
    score += skillScore * 0.4;
    if (skillOverlap >= 2) reasons.push(`Matches ${skillOverlap} of your skills`);
    else if (skillOverlap === 1) reasons.push("Matches some of your skills");
  } else {
    score += 30; // neutral if no skills
  }

  const prefRoles = (profile?.preferredRoles || []).map((r: string) => r.toLowerCase());
  if (prefRoles.length > 0) {
    const title = (job.title || "").toLowerCase();
    let roleFit = 40;
    if (prefRoles.some((r: string) => title.includes(r.split(" ")[0]))) roleFit = 100;
    else if (prefRoles.some((r: string) => title.includes(r))) roleFit = 90;
    score += roleFit * 0.3;
    if (roleFit >= 90) reasons.push("Matches your preferred role");
  } else {
    score += 70 * 0.3;
  }

  const locs = (job.locationNormalized || []).join(" ");
  if (locs.includes("bengaluru") || locs.includes("bangalore")) {
    score += 100 * 0.15;
    reasons.push("Bengaluru location");
  } else if ((job.workMode || "").toLowerCase().includes("remote")) {
    score += 100 * 0.15;
    reasons.push("Remote friendly");
  } else {
    score += 40 * 0.15;
  }

  score += 70 * 0.1; // company type neutral
  score += 70 * 0.05; // industry neutral

  if (isFresherFriendly(job)) reasons.push("Fresher-friendly");
  
  // cap
  if (score > 100) score = 100;
  if (score < 10) score = 10;
  
  return { score: Math.round(score), reasons: reasons.slice(0, 3) };
}

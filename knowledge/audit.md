# Audit of Job Tracker Plan for Bengaluru Freshers

**Date:** 2026-10-28
**Auditor:** AI Assistant
**Goal:** Help a Bengaluru fresher go from resume/profile to a shortlist of relevant jobs in under 5 minutes

## Executive Summary

The plan is well-scoped and pragmatic for a first iteration. It correctly focuses on solving a real pain point (job discovery for freshers) while deliberately avoiding scope creep. The "under 5 minutes to shortlist" goal is ambitious but achievable with the proposed narrow scope.

**Overall Assessment:** Strong - Ready for implementation with minor refinements.

## Strengths

### Scope Management
- **Appropriate scope:** Focused on Bengaluru freshers is specific enough to validate
- **Good "what to skip":** Correctly identifies complex features to defer (one-click apply, resume tailoring, referrals, ML)
- **Rule-based scoring:** Smart choice for MVP - transparent, debuggable, and avoids ML infrastructure complexity
- **2-3 sources:** Right approach - better to do few sources well than many poorly

### Feature Design
- **Profile extraction:** Good idea to support both upload and guided form as fallbacks
- **Deduplication:** Critical for job aggregators; company+title+location+URL is a solid key
- **Status tracking:** The status flow (Saved → Applied → Interviewing → Offer/Rejected/Closed) matches real fresher needs
- **Match reasons:** Showing "why" builds trust and helps users understand the ranking
- **Metrics-driven:** Good set of success metrics focused on activation and engagement

### User Journey
- Clear path: Auth → Profile → Jobs → Track
- Focuses on "discovery + tracking" rather than full application lifecycle
- Emphasizes speed to value (< 5 min)

## Areas of Concern / Gaps

### Technical Gaps
| Issue | Severity | Recommendation |
|---|---|---|
| **Resume parsing** | High | Need to specify how extraction works. Consider using existing libraries (pdf-parse, mammoth) or LLM for parsing. Also need to handle failures gracefully. |
| **Job source integration** | High | "2-3 reliable sources" is vague. Need to evaluate actual APIs/scraping feasibility. Some job boards block scraping. Consider Naukri, LinkedIn, Indeed, Hirist, or Wellfound. |
| **Deduplication logic** | Medium | URL normalization needed (tracking params, different domains). Company name normalization (case, Pvt Ltd variations). Title normalization matters. |
| **Scoring weights** | Medium | Plan mentions scoring factors but not weights. Need to define if skill overlap is 50%, role fit 30%, etc. Also need to handle missing preferences. |
| **Authentication** | Medium | Email/Google sign-in - need to decide on auth provider (Auth0, Clerk, Supabase, NextAuth). Also need to consider email verification. |

### Product Gaps
| Issue | Severity | Recommendation |
|---|---|---|
| **"Relevant jobs" definition** | High | Success metric says "% who see at least 10 relevant jobs" but "relevant" isn't defined. Need clear criteria (e.g., entry-level, fresher-friendly, Bengaluru location). |
| **Onboarding completion** | High | Need to define minimum required profile fields vs optional. Too many required fields will hurt completion rate. |
| **Location handling** | Medium | "Bengaluru" has variations (Bangalore, Bengaluru, Remote from BLR). Also need to handle hybrid/WFH. |
| **Salary ranges** | Medium | Freshers often care about range but many postings don't have it. How to filter/display? |
| **Company type** | Medium | "Startup vs MNC vs Service-based" - need clear categorization logic. |

### Business/Operational Gaps
| Issue | Severity | Recommendation |
|---|---|---|
| **Data freshness** | Medium | No mention of how often to refresh jobs. Stale jobs hurt trust. Need refresh strategy. |
| **Rate limiting/scraping ethics** | Medium | If scraping, need to respect robots.txt, rate limits, terms of service. |
| **Legal/ToS** | Low | Some job boards prohibit scraping. Better to use official APIs where possible. |
| **Scale** | Low | Fine for MVP, but deduplication and storage need to scale reasonably. |

## Recommendations

### Immediate (Before Starting)
1. **Pick specific job sources** - Research actual feasibility of 2-3 sources. Check for APIs, RSS feeds, or scraping policies.
2. **Define "fresher-friendly"** - Create explicit criteria (0-1 years exp, no "3+ years required", etc.)
3. **Design minimal onboarding** - Identify must-have vs nice-to-have profile fields. Aim for < 2 min to complete.
4. **Choose tech stack** - Decide based on team skills. Consider full-stack (Next.js + Supabase) for speed.

### Short-term Improvements
1. **Add data model sketch** - Define User, Profile, Job, JobApplication entities
2. **Scoring rubric** - Document exact scoring formula with weights
3. **Error handling** - Plan for resume parsing failures, no jobs found, source failures
4. **Empty states** - Design UX for "no relevant jobs found" with suggestions

### Metrics Refinement
The metrics are good but add:
- **Time to first relevant job view** (target: < 5 min total journey)
- **Profile completion rate** with threshold definition
- **Job click-through rate** (open posting)
- **Application conversion** (saved → applied)

## Verdict

This is a solid, realistic MVP plan. The discipline to skip complex features is commendable. Focus on execution over perfection - the rule-based approach is the right call for validation.

**Recommendation:** Proceed with implementation, but address the "relevant jobs" definition and specific source selection first as they block core functionality.
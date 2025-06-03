# Hire Al — Masterplan

## 📘 App Overview & Objectives

**Hire Al** is an AI-powered recruitment copilot that enables recruiters to discover and connect with top-tier tech talent via natural language search. It reduces the manual hiring process by auto-parsing resumes, ranking candidates intelligently, and generating personalized outreach.

---

## 🎯 Target Audience

- **Recruiters & Talent Acquisition Teams** in tech and AI startups
- **Hiring Managers** seeking niche skillsets fast
- **Candidates** open to freelance/full-time roles in AI and software

---

## 🧩 Core Features (MVP)

### Candidate Side
- Signup via email/password (Supabase Auth)
- Resume upload (PDF/DOC)
- Profile setup (skills, experience, availability, location)
- Auto-extraction of skills from resumes
- Consent toggle for visibility

### Recruiter Side
- Natural-language search input
- Auto-ranking of matching candidate profiles
- View parsed resumes with key tags
- Personalized AI-generated outreach emails
- Search history and saved queries

---

## 🧱 Technical Architecture Overview

| Layer       | Tool/Tech              | Role                              |
|-------------|------------------------|-----------------------------------|
| Frontend    | Next.js + Tailwind     | Responsive Web UI                 |
| Auth        | Supabase Auth          | Secure login + RBAC               |
| Backend     | Supabase (PostgreSQL + Edge Functions) | Database, file uploads, business logic |
| Resume Parsing | GPT API or 3rd-party API | Extract structured skills & experience |
| LLM         | OpenAI API             | Natural language search + outreach |
| Storage     | Supabase Storage       | Resume and file management        |
| Email       | Resend or SendGrid     | Email delivery                    |
| Analytics   | PostHog or Supabase Logs | Usage tracking and feedback      |
| Hosting     | Vercel                 | CI/CD + deployment                |

---

## 🧠 Conceptual Data Model

### `users`
- id, email, password_hash
- role: 'candidate' | 'recruiter'
- created_at

### `candidate_profiles`
- user_id (FK)
- name, location, availability
- resume_url, parsed_resume_json
- skills: string[]
- experience_summary
- consent_given (boolean)

### `recruiter_searches`
- recruiter_id (FK)
- query_text, timestamp
- returned_profiles (jsonb)
- filters_applied

### `outreach_logs`
- recruiter_id, candidate_id
- message_text, status
- sent_at

---

## 🎨 UI/UX Design Principles

- 3-click recruiter workflow: Search → View → Outreach
- Clean, recruiter-centric interface
- Smart defaults and filters
- Minimal distractions, mobile-friendly (Phase 2)

---

## 🔐 Security & Privacy

- Supabase Auth (email/password)
- Role-based access control (RLS policies)
- Resume storage encrypted at rest
- Consent handling (GDPR-ready)
- API keys managed via environment variables
- Candidate control over profile visibility

---

## 🔧 Development Phases (Segmented)

### 🔹 1. Frontend Development

**Tech**: Next.js, TailwindCSS, TypeScript

- ✅ Setup project repo, Tailwind config, page routing
- 🔸 Candidate Signup & Profile Creation
  - Resume upload UI
  - Skill tagging UI
  - Profile preview/edit
- 🔸 Recruiter Dashboard
  - Search input with placeholder suggestions
  - Display ranked candidate cards
  - Filters (location, availability, skills)
- 🔸 Profile Viewer
  - Resume + parsed info
  - “Send Message” flow
- 🔸 Outreach Composer
  - Preview and edit AI-generated message
  - Send via API call

---

### 🔹 2. Backend & Database

**Tech**: Supabase (PostgreSQL + Functions)

- ✅ Set up Supabase project and schema
- 🔸 Define `users`, `candidate_profiles`, `recruiter_searches`, `outreach_logs`
- 🔸 Configure RLS (Row Level Security) policies
- 🔸 Candidate file uploads (Supabase Storage)
- 🔸 Edge Functions for:
  - Resume parsing trigger (on file upload)
  - Search processing endpoint
  - Outreach logging and email send

---

### 🔹 3. LLM Integration (OpenAI API)

- 🔸 Natural Language Search:
  - Input: Recruiter query
  - Output: Parsed filters + ranked profile logic
  - Prompt design + tuning
- 🔸 Resume Parsing:
  - Input: Uploaded resume text
  - Output: Skills, summary, experience in JSON
  - Handle fallback for unstructured input
- 🔸 Outreach Message Generation:
  - Input: Recruiter role, query, candidate data
  - Output: Personalized email draft

> All LLM use cases will be prompt-tuned and tested for hallucination prevention and performance.

---

### 🔹 4. API Integrations

- 🔸 Email (Resend or SendGrid)
  - Setup sender domain
  - Trigger from backend function
  - Log delivery status
- 🔸 Analytics (PostHog or Supabase Logs)
  - Page views, query usage, outreach conversion
- 🔸 Optional Resume Parsing APIs (Affinda, Sovren)
  - Plug-in fallback if GPT fails or for batch use

---

## 🧪 Testing & QA Strategy

- Unit tests: core functions (search, parsing, outreach)
- Manual test cases for:
  - Upload, parse, view flow
  - Security: RLS for users
  - LLM accuracy (query → result mapping)
  - Email delivery feedback
- Staging environment: Vercel Preview Deploys

---

## 📊 Monitoring & Analytics

- Daily usage metrics (users, searches, outreach)
- Most-used recruiter queries
- Candidate signups + resume success rate
- Heatmaps (PostHog)
- Basic error logging with alerts

---

## ⚖️ Legal & Compliance

- GDPR-compliant: consent toggle, profile control, data deletion
- Privacy policy + terms of service (footer)
- Clear AI usage disclaimer
- Opt-out for AI personalization

---

## 🔁 CI/CD and DevOps

- GitHub → Vercel integration
- Supabase CLI for schema migration tracking
- Environment variables for all API keys
- Previews on PRs with staging data

---

## 📈 Success Metrics (MVP)

- Recruiters: ≥3 successful searches per session
- Candidates: 80%+ upload success rate
- Outreach: ≥20% reply rate
- NPS/feedback survey after use

---

## 🔮 Future Expansion Ideas

- Chat-based search assistant (“Ask Al”)
- Candidate video intros
- ATS integrations (Greenhouse, Lever)
- Recruiter teams & shared projects
- Browser plugin for sourcing from GitHub/LinkedIn
- Paid plans with per-seat pricing
- Automated interview scheduling

---

## ✅ Final Word

This blueprint is structured for a clear MVP execution, while laying groundwork for future expansion into enterprise hiring tools. With strong LLM use cases, clean UI/UX, and recruiter-first features, **Hire Al** is ready to solve real pain in the tech recruiting space.

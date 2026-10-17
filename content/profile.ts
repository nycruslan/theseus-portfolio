// Owner-maintained facts. Agents may restyle how this renders, but never edit it.
// From the owner's CV of 2025-08-09. The phone number and email stay out: this repository, the
// site and every sprint's broadcast are public.

export type Link = {
  label: string;
  href: string;
};

export type Role = {
  company: string;
  title: string;
  period: string;
  summary: string;
};

export type Project = {
  name: string;
  description: string;
  href?: string;
};

export type Education = {
  school: string;
  credential: string;
  period: string;
};

export type SkillGroup = {
  area: string;
  skills: string[];
};

export type Profile = {
  name: string;
  headline: string;
  location: string;
  bio: string;
  links: Link[];
  experience: Role[];
  projects: Project[];
  education: Education[];
  skills: SkillGroup[];
};

export const profile: Profile = {
  name: "Ruslan Shulga",
  headline: "Senior Software Engineer Lead, AI Platforms & Systems",
  location: "New York, NY",
  bio: "I lead the development of enterprise AI systems at JPMorgan Chase: LLM-powered agents, retrieval-augmented generation and autonomous workflow tools, and the platforms they run on. This site is where I explore how a team of AI agents can ship real software.",
  links: [
    { label: "GitHub", href: "https://github.com/nycruslan" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/nycruslan/" },
  ],
  experience: [
    {
      company: "JPMorgan Chase & Co.",
      title:
        "Vice President, Senior Software Engineer Lead – AI Platforms & Systems",
      period: "Sep 2021 — Present",
      summary:
        "Leads enterprise-scale AI systems (LLM-powered agents, RAG pipelines and autonomous workflow tools in Python, LangChain and LangGraph) and the distributed micro-frontend platform that cut time-to-market by 40%. Sets architectural standards across AI research, backend and frontend teams, and scaled multi-tenant AI infrastructure, improving latency by 35%.",
    },
    {
      company: "Earth Designs",
      title: "Full Stack Web Developer",
      period: "Apr 2020 — Sep 2021",
      summary:
        "Owned web applications end to end, from design to deployment. Built reusable UI components and performance monitoring, led the migration of legacy codebases to React and Next.js, and mentored junior developers.",
    },
    {
      company: "PPS Capital",
      title: "Information Technology Manager",
      period: "Jan 2018 — Apr 2020",
      summary:
        "Ran company-wide IT operations, budgets and vendors. Led enterprise web applications with analytics, reporting and automation, and set up disaster recovery and cybersecurity practices.",
    },
    {
      company: "Earth Designs",
      title: "Technology Manager",
      period: "Feb 2016 — Jan 2018",
      summary:
        "Led API-driven web platforms and microservices across the product lifecycle, shaped the technology strategy with the CEO, and built the documentation, onboarding and mentorship the engineering team relied on.",
    },
  ],
  projects: [
    {
      name: "Theseus",
      description:
        "This portfolio. An autonomous team of AI agents keeps rebuilding it, sprint by sprint, in public.",
      href: "https://github.com/nycruslan/theseus-portfolio",
    },
  ],
  education: [
    {
      school: "Harvard University",
      credential: "Certificate in Computer Science (CS50)",
      period: "Jun 2020 — Dec 2020",
    },
    {
      school: "Kyiv National Economic University",
      credential: "Bachelor's and Master's Degree in International Economics",
      period: "Sep 2010 — Jul 2015",
    },
  ],
  skills: [
    {
      area: "AI & LLM development",
      skills: [
        "LangChain",
        "LangGraph",
        "OpenAI API",
        "RAG pipelines",
        "Embeddings",
        "Vector databases (Chroma, Pinecone, Weaviate)",
        "Prompt engineering",
      ],
    },
    {
      area: "Software architecture",
      skills: [
        "Distributed systems",
        "Microservices",
        "Event-driven design",
        "Micro frontends",
      ],
    },
    {
      area: "Backend & data",
      skills: [
        "Python",
        "Node.js",
        "REST & GraphQL APIs",
        "Async processing",
        "Cloud-native data pipelines",
      ],
    },
    {
      area: "Frontend systems",
      skills: [
        "React",
        "Next.js",
        "TypeScript",
        "Design systems",
        "Performance optimization",
      ],
    },
    {
      area: "Cloud & DevOps",
      skills: [
        "AWS",
        "Azure",
        "GCP",
        "Docker",
        "Kubernetes",
        "CI/CD automation",
      ],
    },
    {
      area: "Leadership",
      skills: [
        "Engineering management",
        "Cross-org strategy",
        "Architecture governance",
        "Mentorship",
        "Stakeholder communication",
      ],
    },
  ],
};

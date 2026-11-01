// Owner-maintained facts. Agents may restyle how this renders, but never edit it.
// From the owner's 2026 sources: their master résumé (June 2026) and their earlier public portfolio.
// The email is here so a hiring executive can reach them in one click. The phone number stays out:
// this repository, the site and every sprint's broadcast are public.

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

export type Profile = {
  name: string;
  headline: string;
  location: string;
  bio: string;
  links: Link[];
  experience: Role[];
  projects: Project[];
  education: Education[];
  /** The tools the owner works with. */
  stack: string[];
};

export const profile: Profile = {
  name: "Ruslan Shulga",
  headline: "VP Engineering, AI Platform",
  location: "New York, NY",
  bio: "VP Engineering at JPMorgan Chase. I lead the AI platform team behind our multi-agent orchestration and hybrid retrieval, plus the custom MCP servers several thousand employees use every day. This site is where a team of AI agents shows what it can ship on its own.",
  links: [
    { label: "Email", href: "mailto:nycruslan@gmail.com" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/nycruslan/" },
    { label: "GitHub", href: "https://github.com/nycruslan" },
  ],
  experience: [
    {
      company: "JPMorgan Chase & Co.",
      title:
        "Vice President, Senior Software Engineer Lead – AI Platforms & Systems",
      period: "Sep 2021 — Present",
      summary:
        "Built the multi-agent workflows several thousand employees use firm-wide, on LangGraph with the Claude Agent SDK and OpenAI Agents SDK, and cut manual processing on the flagship workflow by about 55%. Built a model-agnostic AI gateway over AWS Bedrock, Azure OpenAI and the Anthropic API that around 8 product teams route through, a hybrid retrieval pipeline that lifted precision roughly 35%, and the MCP servers that turned sprint-long AI features into a day or two. Lead a team of 7 across AI research, backend and platform.",
    },
    {
      company: "Earth Designs",
      title: "Full Stack Web Developer",
      period: "Apr 2020 — Sep 2021",
      summary:
        "Ran the React and Next.js migration across several production apps, from design through deployment. Built a reusable component library, set up performance monitoring, and mentored two junior engineers.",
    },
    {
      company: "PPS Capital",
      title: "Information Technology Manager",
      period: "Jan 2018 — Apr 2020",
      summary:
        "Ran IT operations and infrastructure strategy company-wide, and led internal web apps for analytics and reporting. Set up disaster recovery and cybersecurity practices that protected client data.",
    },
    {
      company: "Earth Designs",
      title: "Technology Manager",
      period: "Feb 2016 — Jan 2018",
      summary:
        "Led API-driven web platforms and microservices, worked closely with the CEO on tech strategy, and set up the team's documentation and onboarding.",
    },
  ],
  projects: [
    {
      name: "Theseus",
      description:
        "This portfolio. An autonomous team of AI agents keeps rebuilding it, sprint by sprint, in public.",
      href: "https://github.com/nycruslan/theseus-portfolio",
    },
    {
      name: "view-json-react",
      description:
        "An accessible, dependency-free React JSON tree viewer with safe inspection, search and virtualization. Open source.",
      href: "https://github.com/nycruslan/view-json-react",
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
      credential: "Bachelor's and Master's, International Economics",
      period: "Sep 2010 — Jul 2015",
    },
  ],
  stack: [
    "Python",
    "TypeScript",
    "LangGraph",
    "LangChain",
    "Claude Agent SDK",
    "OpenAI Agents SDK",
    "MCP",
    "Pinecone",
    "Weaviate",
    "pgvector",
    "AWS Bedrock",
    "Azure OpenAI",
    "React",
    "Next.js",
    "Astro",
    "Node.js",
    "Docker",
    "Kubernetes",
  ],
};

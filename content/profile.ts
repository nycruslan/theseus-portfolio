// Owner-maintained facts. Agents may restyle how this renders, but never edit it.

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

export type Profile = {
  name: string;
  headline: string;
  location: string;
  bio: string;
  links: Link[];
  experience: Role[];
  projects: Project[];
};

export const profile: Profile = {
  name: "Ruslan",
  // TODO(owner): replace
  headline: "Software Engineer",
  // TODO(owner): replace
  location: "New York, NY",
  // TODO(owner): replace
  bio: "I build web products end to end and explore how teams of AI agents can ship real software.",
  links: [
    { label: "GitHub", href: "https://github.com/nycruslan" },
    // TODO(owner): replace
    { label: "LinkedIn", href: "https://www.linkedin.com/" },
  ],
  // TODO(owner): replace
  experience: [
    {
      company: "Company name",
      title: "Senior Software Engineer",
      period: "2022 — Present",
      summary: "What you built, owned and improved.",
    },
    {
      company: "Previous company",
      title: "Software Engineer",
      period: "2019 — 2022",
      summary: "What you built, owned and improved.",
    },
  ],
  projects: [
    {
      name: "Theseus",
      description:
        "This portfolio. An autonomous team of AI agents keeps rebuilding it, sprint by sprint, in public.",
      // TODO(owner): replace
      href: "https://github.com/nycruslan",
    },
  ],
};

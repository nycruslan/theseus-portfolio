import { Section } from "@/components/section";
import { profile } from "@/content/profile";
import { SITE_URL } from "@/lib/site";

// Who this page is about, for search engines: the owner's facts from content/profile.ts as they
// appear on the page, and nothing more.
const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  jobTitle: profile.headline,
  description: profile.bio,
  url: SITE_URL,
  sameAs: profile.links.map((link) => link.href),
};

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-16 px-6 py-24">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has to be the script's raw text (React would escape it as HTML), and escaping "<" keeps the data from closing the tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(person).replace(/</g, "\\u003c"),
        }}
      />
      <header className="flex flex-col gap-4">
        <h1 className="text-step-2xl font-semibold tracking-tight">
          {profile.name}
        </h1>
        <p className="text-step-xl">{profile.headline}</p>
        <p className="text-step-base text-muted">{profile.location}</p>
        <p className="text-step-lg">{profile.bio}</p>
      </header>

      <Section id="experience" title="Experience">
        <ol className="flex flex-col gap-8">
          {profile.experience.map((role) => (
            <li key={`${role.company}-${role.period}`}>
              <h3 className="text-balance text-step-lg font-medium">
                {role.title} · {role.company}
              </h3>
              <p className="text-step-sm text-muted">{role.period}</p>
              <p className="mt-2 text-step-base">{role.summary}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="projects" title="Projects">
        <ul className="flex flex-col gap-8">
          {profile.projects.map((project) => (
            <li key={project.name}>
              <h3 className="text-balance text-step-lg font-medium">
                {project.href ? (
                  <a
                    href={project.href}
                    className="text-accent underline-offset-4 hover:underline"
                  >
                    {project.name}
                  </a>
                ) : (
                  project.name
                )}
              </h3>
              <p className="mt-2 text-step-base">{project.description}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="contact" title="Contact">
        <ul className="flex flex-wrap gap-6">
          {profile.links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-step-base text-accent underline underline-offset-4 hover:text-foreground"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}

import { profile } from "@/content/profile";
import { splitBio } from "@/lib/bio";
import { STUDIO_URL } from "@/lib/site";

const LINK =
  "text-foreground underline decoration-1 underline-offset-[3px] hover:decoration-2";

// The sheet's title block (notes-iris.md, section 7): the owner's name as the largest text on the
// page, his role and place, the bio's first two sentences and his links. It is main's header, the
// first thing a screen reader meets in main and the page's largest paint (B1.9).
export function TitleBlock({ className = "" }: { className?: string }) {
  return (
    <header
      className={`sheet-row flex flex-col border-t-2 border-foreground px-4 pt-3.5 pb-6 lg:border-r lg:border-b lg:px-7 lg:pt-[18px] lg:pb-4 ${className}`}
    >
      <h1 className="font-cond text-step-3xl leading-[0.9] font-bold tracking-[-0.01em] lg:leading-[0.86]">
        {profile.name}
      </h1>
      <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 border-t border-foreground pt-1.5 lg:mt-3.5 lg:pt-2">
        <p className="text-step-lg leading-[1.2] font-[650]">
          {profile.headline}
        </p>
        <p className="text-step-sm text-muted">{profile.location}</p>
      </div>
      {/* From 1024 the one-line revisions (sprint 25, batch E) can leave this block the taller of
          the pair, and the Contact row's auto margin is then 0: this margin is its floor. */}
      <p className="mt-2 max-w-[548px] text-step-base leading-[1.45] lg:mt-2.5 lg:mb-3">
        {splitBio(profile.bio).lead}
      </p>
      {/* Pushed to the block's foot beside the revisions, except on a window too short for the
          whole sheet, where it follows the bio (app/globals.css, "The sheet on a laptop window").
          No id: #contact is the Contact section. */}
      <p className="title-contact mt-3.5 flex flex-wrap items-center gap-x-[18px] border-t border-rule pt-1 text-step-base lg:mt-auto lg:gap-x-[22px] lg:pt-2">
        <a
          href="#case-studies"
          className={`inline-flex min-h-11 items-center lg:min-h-0 ${LINK}`}
        >
          Case studies
        </a>
        <a
          href="/ask"
          className={`inline-flex min-h-11 items-center lg:min-h-0 ${LINK}`}
        >
          Ask AI
        </a>
        {/* From 768: a phone's row has no room, so a phone reaches the Studio from /crew. */}
        <a
          href={STUDIO_URL}
          className={`hidden min-h-11 items-center md:inline-flex lg:min-h-0 ${LINK}`}
        >
          Live Studio
        </a>
        {/* Below 1440 the links must keep to one line for the first screen's budget, so no label. */}
        <span className="hidden text-muted min-[90rem]:ml-auto min-[90rem]:inline">
          Contact
        </span>
        {profile.links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={`inline-flex min-h-11 items-center lg:min-h-0 ${LINK}`}
          >
            {link.label}
          </a>
        ))}
      </p>
    </header>
  );
}

import Link from "next/link";
import { GitHubDark, LinkedIn, XDark } from "developer-icons";
import WorksyTitle from "./ui/worksy_title";

const footerLinks = [
  {
    title: "Explore",
    links: [
      { label: "Find jobs", href: "/jobs" },
      { label: "Saved jobs", href: "/saved" },
      { label: "My profile", href: "/profile" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Worksy", href: "/about" },
      { label: "Contact", href: "mailto:bichitrabehera.345@gmail.com" },
      { label: "Privacy policy", href: "/privacy" },
    ],
  },
];

const socials = [
  {
    label: "LinkedIn",
    href: "https://linkedin.com/in/bichitrabehera",
    Icon: LinkedIn,
  },
  {
    label: "X (Twitter)",
    href: "https://x.com/bichitradotdev",
    Icon: XDark,
  },
];

const linkClass =
  "rounded-sm underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black";

const Footer = () => {
  return (
    <footer className="bg-background overflow-hidden border-t py-10">
      <div className="relative mx-auto flex w-full max-w-5xl flex-col px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 py-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:py-16">
          <div>
            <h2 className="text-foreground max-w-sm text-3xl leading-tight font-semibold tracking-tight text-balance">
              Your next opportunity starts here.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-3">
            {footerLinks.map(({ title, links }) => (
              <nav key={title} aria-label={title}>
                <h3 className="text-foreground">{title}</h3>

                <ul className="text-muted-foreground mt-4 space-y-3 text-sm">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href} className={linkClass}>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            <div>
              <h3 className="text-foreground">Connect</h3>

              <ul className="mt-4 space-y-3 text-sm">
                {socials.map(({ label, href, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-muted-foreground inline-flex items-center gap-2.5 ${linkClass}`}
                    >
                      <Icon size={20} />
                      {label}
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center overflow-hidden py-4">
          <WorksyTitle />
        </div>
      </div>
    </footer>
  );
};

export default Footer;

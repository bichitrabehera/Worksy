import Link from "next/link";
import { GitHubDark, LinkedIn } from "developer-icons";

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
    label: "GitHub",
    href: "https://github.com/bichitrabehera",
    Icon: GitHubDark,
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/in/bichitrabehera",
    Icon: LinkedIn,
  },
];

const linkClass =
  "rounded-sm text-black underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black";

const Footer = () => {
  return (
    <footer className="overflow-hidden bg-white text-zinc-900">
      <div className="bg-brand mx-auto my-10 max-w-5xl rounded-br-[50px] rounded-bl-[50px] border-r border-b border-l px-5 sm:px-8">
        <div className="grid gap-14 py-14 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-20 lg:py-20">
          <div>
            <Link
              href="/"
              className="font-[copper] text-3xl font-semibold tracking-tight text-white"
            >
              Worksy
            </Link>

            <h2 className="mt-5 max-w-sm text-3xl leading-tight font-semibold tracking-tight text-balance text-black">
              Your next opportunity starts here.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
            {footerLinks.map(({ title, links }) => (
              <nav key={title} aria-label={title}>
                <h3 className="text-sm font-bold text-black">{title}</h3>

                <ul className="mt-5 space-y-3.5 text-sm font-medium">
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
              <h3 className="text-sm font-bold text-black">Connect</h3>

              <ul className="mt-5 space-y-3.5 text-sm font-medium">
                {socials.map(({ label, href, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2.5 ${linkClass}`}
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

        <div className="flex justify-center overflow-hidden py-8">
          <h1
            aria-label="Worksy"
            className="tracking-3 shrink-0 font-[copper] text-[clamp(5rem,15vw,13rem)] leading-[0.8] whitespace-nowrap text-black select-none"
          >
            WORKSY
          </h1>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

import React from "react";
import Link from "next/link";
import { ArrowUpRight, MoveUpRight } from "lucide-react";
import { GitHubLight, LinkedIn } from "developer-icons";

const Footer = () => {
  return (
    <footer className="border-t border-zinc-800 bg-[#202020] text-white">
      <div className="mx-auto max-w-5xl px-4 pt-16 pb-8 sm:px-10">
        {/* Top section */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex gap-6">
              <Link
                href="/"
                className="text-brand font-[copper] text-xl font-semibold"
              >
                Worksy
              </Link>
            </div>

            <p className="mt-5 max-w-sm text-sm leading-7 text-zinc-400">
              Your next opportunity shouldn't be hard to find. Discover remote
              jobs, explore new possibilities, and take the next step in your
              career.
            </p>

            <a
              href="mailto:bichitrabehera.345@gmail.com"
              className="mt-6 inline-flex items-center gap-2 text-sm text-zinc-300 transition hover:text-white"
            >
              Get in touch
            </a>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-sm font-semibold">Explore</h3>
            <ul className="mt-5 space-y-3 text-sm text-zinc-400">
              <li>
                <Link href="/jobs" className="transition hover:text-white">
                  Find jobs
                </Link>
              </li>
              <li>
                <Link href="/saved" className="transition hover:text-white">
                  Saved jobs
                </Link>
              </li>
              <li>
                <Link href="/profile" className="transition hover:text-white">
                  My profile
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold">Company</h3>
            <ul className="mt-5 space-y-3 text-sm text-zinc-400">
              <li>
                <Link href="/about" className="transition hover:text-white">
                  About us
                </Link>
              </li>
              <li>
                <a
                  href="mailto:bichitrabehera.345@gmail.com"
                  className="transition hover:text-white"
                >
                  Contact
                </a>
              </li>
              <li>
                <Link href="/privacy" className="transition hover:text-white">
                  Privacy policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-sm font-semibold">Connect</h3>
            <ul className="mt-5 space-y-3 text-sm text-zinc-400">
              <li>
                <a
                  href="https://github.com/bichitrabehera"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 transition hover:text-white"
                >
                  <GitHubLight size={15} />
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://linkedin.com/in/bichitrabehera"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 transition hover:text-white"
                >
                  <LinkedIn size={15} />
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-16 flex flex-col gap-4 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">Worksy. All rights reserved.</p>

          <p className="text-xs text-zinc-500">
            Built to make your next move easier.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

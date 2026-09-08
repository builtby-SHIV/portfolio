import Link from "next/link";
import ScrollReveal from "@/app/components/ScrollReveal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects — Shiv",
  description: "Things I've built across backend systems, distributed architectures, and real-time web applications.",
};

const PROJECTS = [
  {
    title: "Aakaar",
    description:
      "Local podcast recording platform for creators with an in-browser lightweight video editor. Combined studio to host, record, edit and export without leaving the browser.",
    tech: ["NextJS", "TypeScript", "TurboRepo", "LiveKit"],
    github: "https://github.com/builtby-SHIV/aakaar",
  },
  {
    title: "Scribbl",
    description:
      "A Real-time, server authoritative multiplayer canvas-based draw and guess game with live syncing and late-joiner replay. Features live stroke-syncing with region-locked rooms (no Redis) for low-latency and Web-Worker flood-fill tool.",
    tech: ["NextJS", "TypeScript", "Zustand", "Socket.IO"],
    github: "https://github.com/builtby-SHIV/scribbl",
  },
  {
    title: "Sect",
    description:
      "Real-time messaging application for Instant bidirectional communication powered by Socket.io for low-latency messaging. Debounced search to quickly discover registered users and start conversations.",
    tech: ["ReactJS", "NodeJS", "ExpressJS", "MongoDB", "Zustand", "Socket.IO"],
    github: "https://github.com/builtby-SHIV/sect",
  },
];

export default function ProjectsPage() {
  return (
    <main className="mx-auto max-w-180 px-5 pt-8 md:pt-14 pb-16 md:pb-24">
      <ScrollReveal className="mb-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider mb-8 transition-colors"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            color: "var(--fg-faint)",
          }}
        >
          <span aria-hidden="true">&larr;</span> Back to home
        </Link>
        <h1
          className="text-3xl md:text-4xl tracking-tight mb-3"
          style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
        >
          Projects
        </h1>
        <p className="text-base" style={{ color: "var(--fg-muted)" }}>
          A collection of backend systems, real-time engines, and tools I&apos;ve crafted.
        </p>
      </ScrollReveal>

      <hr className="mb-12 md:mb-14" />

      <div className="space-y-12">
        {PROJECTS.map((project) => (
          <ScrollReveal key={project.title} as="article">
            <h2
              className="text-xl md:text-2xl mb-2"
              style={{
                fontFamily: "var(--font-newsreader), Georgia, serif",
                fontWeight: 500,
              }}
            >
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {project.title}
              </a>
            </h2>

            <p
              className="text-sm mb-3 max-w-[65ch] leading-relaxed"
              style={{ color: "var(--fg)" }}
            >
              {project.description}
            </p>

            <div
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs mb-3"
              style={{ color: "var(--fg-faint)" }}
            >
              {project.tech.map((t, i, arr) => (
                <span key={t} className="inline-flex items-center gap-x-2">
                  <span className="transition-colors duration-200 hover:text-[var(--fg)] cursor-default">
                    {t}
                  </span>
                  {i < arr.length - 1 && <span className="select-none opacity-50">·</span>}
                </span>
              ))}
            </div>

            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm"
            >
              GitHub
            </a>
          </ScrollReveal>
        ))}
      </div>

      <hr className="my-14 md:my-16" />

      <ScrollReveal className="text-center">
        <p className="text-sm mb-4" style={{ color: "var(--fg-muted)" }}>
          Want to see more code or collaborate?
        </p>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          <a href="mailto:shivshukla00514@gmail.com">Email</a>
          <a href="https://github.com/builtby-SHIV" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href="https://x.com/builtbyshiv" target="_blank" rel="noopener noreferrer">
            X
          </a>
          <a href="https://medium.com/@shiivv147" target="_blank" rel="noopener noreferrer">
            Medium
          </a>
        </nav>
      </ScrollReveal>
    </main>
  );
}

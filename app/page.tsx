import ThemeToggle from "./components/ThemeToggle";
import ScrollReveal from "./components/ScrollReveal";
import Image from "next/image";

export default function Home() {
  return (
    <>
      <ThemeToggle />

      <main className="mx-auto max-w-180 px-5 pt-6 md:pt-10 pb-16 md:pb-24">

        {/* ── Hero ── */}
        <ScrollReveal className="mb-16 md:mb-20">
          <div className="relative w-full aspect-2/1 sm:aspect-[2.4/1] mb-6 md:mb-8 overflow-hidden rounded-lg">
            <Image
              src="/hero_banner6.png"
              alt="Hero"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 720px) 100vw, 720px"
            />
          </div>
          <h1
            className="text-4xl md:text-5xl tracking-tight mb-3"
            style={{ fontFamily: "var(--font-newsreader), Georgia, serif", fontWeight: 400 }}
          >
            Shiv
          </h1>
          <p className="text-base md:text-lg" style={{ color: "var(--fg-muted)" }}>
            CS Student · Building what I like · Open to SWE internships
          </p>
        </ScrollReveal>
        
        {/* ── About ── */}
        <ScrollReveal className="mb-14 md:mb-16 max-w-[65ch]">
          <p className="text-base leading-[1.8]" style={{ color: "var(--fg)" }}>
            I’m a CS undergraduate who enjoys writing clear, efficient, and maintainable code while understanding the engineering decisions behind it. I’m particularly interested in the “why” behind systems—how they are designed, scaled, and made reliable in production.

I’m progressively building projects that take me deeper into backend engineering, distributed systems, and production-grade software. Currently, I’m open to internship opportunities where I can contribute to real-world systems, learn from experienced engineers, and grow.

          </p>
        </ScrollReveal>

        <hr className="mb-14 md:mb-16" />

        {/* ── Skills ── */}
        <ScrollReveal className="mb-14 md:mb-16">
          <h2
            className="text-2xl mb-6 md:mb-8"
            style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
          >
            Tools I Tinker with
          </h2>
          <div className="space-y-6 text-sm sm:text-base">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-8">
              <span
                className="w-28 shrink-0 text-xs tracking-wider uppercase"
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  color: "var(--fg-faint)",
                }}
              >
                LANGUAGES
              </span>
              <div className="flex flex-wrap gap-x-6 gap-y-2 font-medium" style={{ color: "var(--fg)" }}>
                <span>JavaScript</span>
                <span>TypeScript</span>
                <span>Python</span>
                <span>Go</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-8">
              <span
                className="w-28 shrink-0 text-xs tracking-wider uppercase"
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  color: "var(--fg-faint)",
                }}
              >
                FRONTEND
              </span>
              <div className="flex flex-wrap gap-x-6 gap-y-2 font-medium" style={{ color: "var(--fg)" }}>
                <span>React</span>
                <span>Next.js</span>
                <span>TanStack Query</span>
                <span>Tailwind CSS</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-8">
              <span
                className="w-28 shrink-0 text-xs tracking-wider uppercase"
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  color: "var(--fg-faint)",
                }}
              >
                BACKEND
              </span>
              <div className="flex flex-wrap gap-x-6 gap-y-2 font-medium" style={{ color: "var(--fg)" }}>
                <span>Node JS</span>
                <span>Express</span>
                <span>tRPC</span>
                <span>Go</span>
              </div>
            </div>



            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-8">
              <span
                className="w-28 shrink-0 text-xs tracking-wider uppercase"
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  color: "var(--fg-faint)",
                }}
              >
                Databases
              </span>
              <div className="flex flex-wrap gap-x-6 gap-y-2 font-medium" style={{ color: "var(--fg)" }}>
                <span>PostgreSQL</span>
                <span>MongoDB</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-8">
              <span
                className="w-28 shrink-0 text-xs tracking-wider uppercase"
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  color: "var(--fg-faint)",
                }}
              >
                Extra
              </span>
              <div className="flex flex-wrap gap-x-6 gap-y-2 font-medium" style={{ color: "var(--fg)" }}>
                <span>Drizzle</span>
                <span>Git</span>
                <span>bun</span>
              </div>
            </div>

            {/* <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-8">
              <span
                className="w-28 shrink-0 text-xs tracking-wider uppercase"
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  color: "var(--fg-faint)",
                }}
              >
                ML / DATA
              </span>
              <div className="flex flex-wrap gap-x-6 gap-y-2 font-medium" style={{ color: "var(--fg)" }}>
                <span>PyTorch</span>
                <span>ONNX</span>
                <span>NumPy</span>
                <span>Pandas</span>
              </div>
            </div> */}
          </div>
        </ScrollReveal>

        <hr className="mb-14 md:mb-16" />

        {/* ── Projects ── */}
        <ScrollReveal className="mb-14 md:mb-16">
          <h2
            className="text-2xl mb-8 md:mb-10"
            style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
          >
            Projects
          </h2>

          <article className="mb-10">
            <h3
              className="text-lg mb-1"
              style={{
                fontFamily: "var(--font-newsreader), Georgia, serif",
                fontWeight: 500,
              }}
            >
              Aakaar
            </h3>
            <p className="text-sm mb-2 max-w-[65ch]" style={{ color: "var(--fg-muted)" }}>
              Local podcast recoring platform for creators with an in-browser lightweight
              video editor. Combined studio to host, record, edit and export without
              leaving the browser.
            </p>
            <p className="text-xs mb-2" style={{ color: "var(--fg-faint)" }}>
              NextJS · TypeScript · TurboRepo · LiveKit
            </p>
            <a
              href="https://github.com/builtby-SHIV/aakaar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm"
            >
              GitHub →
            </a>
          </article>

          <hr className="mb-10" />

          <article className="mb-10">
            <h3
              className="text-lg mb-1"
              style={{
                fontFamily: "var(--font-newsreader), Georgia, serif",
                fontWeight: 500,
              }}
            >
              Scribbl
            </h3>
            <p className="text-sm mb-2 max-w-[65ch]" style={{ color: "var(--fg-muted)" }}>
              A Real-time, server authoritative multiplayer canvas-based draw and guess
              game with live syncing and late-joiner replay. Features live stroke-syncing
              with region-locked rooms (no Redis) for low-latency and Web-Worker
              flood-fill tool.
            </p>
            <p className="text-xs mb-2" style={{ color: "var(--fg-faint)" }}>
              NextJS · TypeScript · Zustand · Socket.IO
            </p>
            <a
              href="https://github.com/builtby-SHIV/scribbl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm"
            >
              GitHub →
            </a>
          </article>

          <hr className="mb-10" />

          <article>
            <h3
              className="text-lg mb-1"
              style={{
                fontFamily: "var(--font-newsreader), Georgia, serif",
                fontWeight: 500,
              }}
            >
              Sect
            </h3>
            <p className="text-sm mb-2 max-w-[65ch]" style={{ color: "var(--fg-muted)" }}>
              Real-time messaging application for Instant bidirectional communication 
              powered by Socket.io for low-latency messaging. Debounced search to 
              quickly discover registered users and start conversations.
            </p>
            <p className="text-xs mb-2" style={{ color: "var(--fg-faint)" }}>
              ReactJS · NodeJS · ExpressJS · MongoDB · Zustand · Socket.IO
            </p>
            <a
              href="https://github.com/builtby-SHIV/sect"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm"
            >
              GitHub →
            </a>
          </article>
        </ScrollReveal>

        <hr className="mb-14 md:mb-16" />

        {/* ── Open Source ── */}
        {/* <ScrollReveal className="mb-20">
          <h2
            className="text-2xl mb-6"
            style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
          >
          </h2>

          <div className="mb-4">
            <p className="text-sm">
              <span className="font-medium">next.js</span>
              <span style={{ color: "var(--fg-faint)" }}> — </span>
              <span style={{ color: "var(--fg-muted)" }}>
                Improved TypeScript inference for App Router route params
              </span>
            </p>
            <a
              href="https://github.com/vercel/next.js/pull/00000"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm"
            >
              PR #00000
            </a>
          </div>

          <div>
            <p className="text-sm">
              <span className="font-medium">langchain</span>
              <span style={{ color: "var(--fg-faint)" }}> — </span>
              <span style={{ color: "var(--fg-muted)" }}>
                Added streaming support for custom LLM wrappers
              </span>
            </p>
            <a
              href="https://github.com/langchain-ai/langchain/pull/00000"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm"
            >
              PR #00000
            </a>
          </div>
        </ScrollReveal>

        <hr className="mb-20" /> */}

        {/* ── Experience ── */}
        {/* <ScrollReveal className="mb-20">
          <h2
            className="text-2xl mb-6"
            style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
          >
            Experience
          </h2>
          <ul className="space-y-3 text-sm">
            <li>
              <span
                className="inline-block w-14 mr-3 tabular-nums"
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  color: "var(--fg-faint)",
                  fontSize: "0.8em",
                }}
              >
                2025
              </span>
              Software Engineering Intern, TechCorp
            </li>
            <li>
              <span
                className="inline-block w-14 mr-3 tabular-nums"
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  color: "var(--fg-faint)",
                  fontSize: "0.8em",
                }}
              >
                2024
              </span>
              ML Research Assistant, University AI Lab
            </li>
            <li>
              <span
                className="inline-block w-14 mr-3 tabular-nums"
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  color: "var(--fg-faint)",
                  fontSize: "0.8em",
                }}
              >
                2023
              </span>
              Teaching Assistant, Data Structures &amp; Algorithms
            </li>
          </ul>
        </ScrollReveal>

        <hr className="mb-20" /> */}

        {/* ── Contact ── */}
        <ScrollReveal className="pb-16">
          <p className="text-sm mb-5" style={{ color: "var(--fg-muted)" }}>
            Feel free to reach out — always happy to chat.
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <a href="mailto:shivshukla00514@gmail.com">Email</a>
            <a href="https://github.com/builtby-SHIV" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a href="https://www.linkedin.com/in/shiv-shukla-97874427b/" target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
            <a href="https://x.com/builtbyshiv" target="_blank" rel="noopener noreferrer">
              X
            </a>
          </nav>
        </ScrollReveal>
      </main>
    </>
  );
}

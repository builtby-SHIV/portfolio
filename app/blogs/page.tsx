import Link from "next/link";
import { getAllBlogs } from "@/lib/blogs";
import ScrollReveal from "@/app/components/ScrollReveal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Writing — Shiv",
  description: "Articles and engineering notes on systems, backend, and web technologies.",
};

export default function BlogsPage() {
  const blogs = getAllBlogs();

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
          Writing
        </h1>
        <p className="text-base" style={{ color: "var(--fg-muted)" }}>
          Thoughts, technical deep dives, and lessons learned while building systems.
        </p>
      </ScrollReveal>

      <hr className="mb-12 md:mb-14" />

      <div className="space-y-12">
        {blogs.map((blog) => (
          <ScrollReveal key={blog.slug} as="article">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
              <span
                className="text-xs tabular-nums"
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  color: "var(--fg-faint)",
                }}
              >
                {blog.date}
              </span>
              <span style={{ color: "var(--fg-faint)", fontSize: "0.8em" }}>·</span>
              <span
                className="text-xs"
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  color: "var(--fg-faint)",
                }}
              >
                {blog.readTime}
              </span>
            </div>

            <h2
              className="text-xl md:text-2xl mb-2"
              style={{
                fontFamily: "var(--font-newsreader), Georgia, serif",
                fontWeight: 500,
              }}
            >
              <Link href={`/blogs/${blog.slug}`} className="hover:underline">
                {blog.title}
              </Link>
            </h2>

            <p
              className="text-sm mb-3 max-w-[65ch] leading-relaxed"
              style={{ color: "var(--fg-muted)" }}
            >
              {blog.summary}
            </p>

            {blog.tags && blog.tags.length > 0 && (
              <div
                className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs mb-2"
                style={{ color: "var(--fg-faint)" }}
              >
                {blog.tags.map((tag, i, arr) => (
                  <span key={tag} className="inline-flex items-center gap-x-2">
                    <span className="transition-colors duration-200 hover:text-[var(--fg)] cursor-default">
                      {tag}
                    </span>
                    {i < arr.length - 1 && <span className="select-none opacity-50">·</span>}
                  </span>
                ))}
              </div>
            )}
          </ScrollReveal>
        ))}
      </div>

      <hr className="my-14 md:my-16" />

      <ScrollReveal className="text-center">
        <p className="text-sm mb-4" style={{ color: "var(--fg-muted)" }}>
          Have feedback or thoughts on any post?
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

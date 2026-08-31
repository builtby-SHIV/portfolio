import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllBlogSlugs, getBlogBySlug } from "@/lib/blogs";
import ScrollReveal from "@/app/components/ScrollReveal";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllBlogSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    return {
      title: "Blog Not Found — Shiv",
    };
  }

  return {
    title: `${blog.title} — Shiv`,
    description: blog.summary,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-180 px-5 pt-8 md:pt-14 pb-16 md:pb-24">
      <ScrollReveal className="mb-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider transition-colors"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              color: "var(--fg-faint)",
            }}
          >
            <span aria-hidden="true">&larr;</span> Home
          </Link>
          <span style={{ color: "var(--fg-faint)", fontSize: "0.8em" }}>/</span>
          <Link
            href="/blogs"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider transition-colors"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              color: "var(--fg-faint)",
            }}
          >
            Writing
          </Link>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
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

        <h1
          className="text-3xl md:text-4xl lg:text-[2.6rem] leading-[1.2] tracking-tight mb-4"
          style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
        >
          {blog.title}
        </h1>

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

        {blog.mediumUrl && (
          <div className="mt-3">
            <a
              href={blog.mediumUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs transition-colors hover:underline"
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                color: "var(--fg-faint)",
              }}
            >
              Read on Medium &#8599;
            </a>
          </div>
        )}
      </ScrollReveal>

      <hr className="mb-10 md:mb-12" />

      <div
        className="blog-content"
        dangerouslySetInnerHTML={{ __html: blog.htmlContent }}
      />

      <hr className="my-14 md:my-16" />

      <ScrollReveal className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
        <Link
          href="/blogs"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider transition-colors"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            color: "var(--fg-faint)",
          }}
        >
          <span aria-hidden="true">&larr;</span> All articles
        </Link>
        <div className="flex flex-wrap items-center gap-5 text-sm" style={{ color: "var(--fg-muted)" }}>
          {blog.mediumUrl && (
            <>
              <a href={blog.mediumUrl} target="_blank" rel="noopener noreferrer">
                Medium
              </a>
              <span>·</span>
            </>
          )}
          <a href="https://x.com/builtbyshiv" target="_blank" rel="noopener noreferrer">
            Discuss on X
          </a>
          <span>·</span>
          <a href="mailto:shivshukla00514@gmail.com">Reply via Email</a>
        </div>
      </ScrollReveal>
    </main>
  );
}

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

const blogsDirectory = path.join(process.cwd(), "content", "blogs");

export interface BlogFrontmatter {
  title: string;
  date: string;
  summary: string;
  readTime?: string;
  tags?: string[];
  mediumUrl?: string;
  [key: string]: unknown;
}

export interface BlogPostSummary {
  slug: string;
  title: string;
  date: string;
  summary: string;
  readTime: string;
  tags: string[];
  mediumUrl?: string;
}

export interface BlogPost extends BlogPostSummary {
  content: string;
  htmlContent: string;
}

function calculateReadingTime(text: string): string {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

function ensureBlogsDirectory() {
  if (!fs.existsSync(blogsDirectory)) {
    fs.mkdirSync(blogsDirectory, { recursive: true });
  }
}

export function getAllBlogSlugs(): string[] {
  ensureBlogsDirectory();
  const fileNames = fs.readdirSync(blogsDirectory);
  return fileNames
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => fileName.replace(/\.md$/, ""));
}

export function getAllBlogs(): BlogPostSummary[] {
  ensureBlogsDirectory();
  const fileNames = fs.readdirSync(blogsDirectory);
  const allBlogs = fileNames
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, "");
      const fullPath = path.join(blogsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data, content } = matter(fileContents);

      const frontmatter = data as BlogFrontmatter;

      return {
        slug,
        title: frontmatter.title || slug,
        date: frontmatter.date || "",
        summary: frontmatter.summary || "",
        readTime: frontmatter.readTime || calculateReadingTime(content),
        tags: frontmatter.tags || [],
        mediumUrl: frontmatter.mediumUrl,
      };
    });

  // Sort blogs by date descending
  return allBlogs.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    }
    return -1;
  });
}

export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  ensureBlogsDirectory();
  const fullPath = path.join(blogsDirectory, `${slug}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const frontmatter = data as BlogFrontmatter;

  const htmlContent = await marked.parse(content, {
    gfm: true,
    breaks: true,
  });

  return {
    slug,
    title: frontmatter.title || slug,
    date: frontmatter.date || "",
    summary: frontmatter.summary || "",
    readTime: frontmatter.readTime || calculateReadingTime(content),
    tags: frontmatter.tags || [],
    mediumUrl: frontmatter.mediumUrl,
    content,
    htmlContent,
  };
}

import { ReactNode } from "react";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  publishedAt: string;
  readTime: string;
  tags: string[];
  content: ReactNode;
}

// Add new blog posts here. Content should use proper heading hierarchy (h2-h6).
export const blogPosts: BlogPost[] = [];

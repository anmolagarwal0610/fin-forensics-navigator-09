

# Plan: Blog System for Landing Pages

## Architecture

Static blog system using a centralized blog data file. Blogs are added by providing content, which gets added to the data file. No database needed for now — purely frontend.

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/data/blogPosts.ts` | **Create** | Central blog data store — array of blog posts with metadata (title, slug, date, coverImage, readTime, tags, content as markdown/JSX) |
| `src/pages/Blogs.tsx` | **Create** | "Our Blogs" listing page — heading, search bar, blog cards grid, pagination (9 per page), breadcrumbs, "Coming Soon" empty state |
| `src/pages/BlogPost.tsx` | **Create** | Individual blog content page — breadcrumbs, cover image, title, date, read time, rendered content, footer |
| `src/components/blog/BlogCard.tsx` | **Create** | Card component: cover image, title, read time, date |
| `src/components/blog/BlogSearch.tsx` | **Create** | Search input that filters blog titles |
| `src/App.tsx` | **Modify** | Add `/blogs` and `/blogs/:slug` routes |
| `src/components/layout/Header.tsx` | **Modify** | Add "Blogs" nav link |
| `src/components/layout/Footer.tsx` | **Modify** | Add "Blogs" link under Company section |
| `src/components/MobileMenu.tsx` | **Modify** | Add "Blogs" nav link |
| `src/i18n/locales/en.json` | **Modify** | Add `nav.blogs` translation |
| `src/i18n/locales/hi.json` | **Modify** | Add `nav.blogs` translation |

## Blog Data Structure

```typescript
interface BlogPost {
  slug: string;           // URL-friendly identifier
  title: string;          // H1 heading
  description: string;    // Meta description / excerpt
  coverImage: string;     // Path to cover image in public/
  publishedAt: string;    // ISO date string
  readTime: string;       // "3 mins read"
  tags: string[];         // Internal labels/tags
  content: React.ReactNode; // JSX content with proper H1-H6 tags
}
```

## SEO Per Blog Page

Each blog page will automatically include via `DocumentHead`:
- `<title>` — blog title
- `<meta name="description">` — blog description
- `<meta name="robots" content="noindex, nofollow">` — as requested
- Open Graph tags (og:title, og:description, og:url, og:type=article, og:image)
- Twitter card tags
- Canonical URL (`/blogs/{slug}`)
- JSON-LD structured data (`BlogPosting` schema with author, datePublished, headline, image)

**Additional SEO items that will be added:**
- `article:published_time` meta tag
- `article:tag` meta tags for each blog tag
- Proper semantic HTML: `<article>`, `<header>`, `<section>`, `<time datetime="...">`
- H1 for title, H2-H6 used hierarchically in content

## UI Design

### "Our Blogs" Page (reference: screenshot 1)
- Breadcrumbs: `Home > Our Blogs`
- Large centered "Our Blogs" heading (matching theme font/colors)
- Search bar below heading (rounded input with Search button, using theme accent color)
- Blog cards in 3-column grid (responsive: 1 col mobile, 2 col tablet, 3 col desktop)
- Each card: cover image, title, read time + date
- Pagination when blogs exceed 9 (using existing pagination component)
- Empty state: "Coming Soon!" message when no blogs exist

### Blog Post Page (reference: screenshot 2)
- Breadcrumbs: `Home > Our Blogs > {Title truncated}`
- Full-width cover image
- Title as large H1
- Read time + date below title
- Blog content with proper heading hierarchy
- Footer with all existing links

### Theme Compliance
- All CTAs use existing button variants
- Colors follow the FinNavigator design system (accent blue, foreground, muted-foreground)
- Search button uses `variant="default"` or accent styling
- Cards use existing `card` CSS variables

## Flow for Adding New Blogs

For now: provide blog content → I add a new entry to `src/data/blogPosts.ts` with proper slug, metadata, cover image (placed in `public/blog/`), and JSX content with semantic heading tags + noindex/nofollow via DocumentHead.

## Pagination Logic

- 9 blogs per page
- Simple page number navigation at bottom
- URL stays `/blogs` with state-managed page number


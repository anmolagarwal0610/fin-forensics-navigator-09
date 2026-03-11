import { useParams, Link, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import DocumentHead from "@/components/common/DocumentHead";
import { blogPosts } from "@/data/blogPosts";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const BASE_URL = "https://finnavigatorai.com";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find((p) => p.slug === slug);

  useEffect(() => {
    if (!post) return;

    // Add JSON-LD BlogPosting structured data
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-type", "json-ld-blog");
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      image: post.coverImage.startsWith("http")
        ? post.coverImage
        : `${BASE_URL}${post.coverImage}`,
      datePublished: post.publishedAt,
      author: {
        "@type": "Organization",
        name: "Promarma Technologies",
      },
      publisher: {
        "@type": "Organization",
        name: "FinNavigator AI",
        url: BASE_URL,
      },
      mainEntityOfPage: `${BASE_URL}/blogs/${post.slug}`,
      keywords: post.tags.join(", "),
    });
    document.head.appendChild(script);

    // article:published_time and article:tag meta tags
    const metas: HTMLMetaElement[] = [];
    const addMeta = (property: string, content: string) => {
      const m = document.createElement("meta");
      m.setAttribute("property", property);
      m.setAttribute("content", content);
      document.head.appendChild(m);
      metas.push(m);
    };
    addMeta("article:published_time", post.publishedAt);
    post.tags.forEach((tag) => addMeta("article:tag", tag));

    return () => {
      script.remove();
      metas.forEach((m) => m.remove());
    };
  }, [post]);

  if (!post) return <Navigate to="/blogs" replace />;

  const truncatedTitle =
    post.title.length > 40 ? post.title.slice(0, 40) + "…" : post.title;

  return (
    <>
      <DocumentHead
        title={`${post.title} — FinNavigator AI Blog`}
        description={post.description}
        canonicalPath={`/blogs/${post.slug}`}
        type="article"
        noIndex
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/blogs">Our Blogs</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{truncatedTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <article className="max-w-3xl mx-auto">
          {/* Cover image */}
          <div className="rounded-lg overflow-hidden mb-8">
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full aspect-[16/9] object-cover"
            />
          </div>

          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <time dateTime={post.publishedAt}>
                  {format(new Date(post.publishedAt), "dd MMM yyyy")}
                </time>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {post.readTime}
              </span>
            </div>
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent/10 text-accent"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Content */}
          <section className="prose prose-slate dark:prose-invert max-w-none">
            {post.content}
          </section>
        </article>
      </div>
    </>
  );
};

export default BlogPost;

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import DocumentHead from "@/components/common/DocumentHead";
import BlogCard from "@/components/blog/BlogCard";
import BlogSearch from "@/components/blog/BlogSearch";
import { blogPosts } from "@/data/blogPosts";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const POSTS_PER_PAGE = 9;

const Blogs = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return blogPosts;
    const q = search.toLowerCase();
    return blogPosts.filter((p) => p.title.toLowerCase().includes(q));
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  return (
    <>
      <DocumentHead
        title="Our Blogs — FinNavigator AI"
        description="Explore our latest articles on financial forensics, compliance, and investigation insights."
        canonicalPath="/blogs"
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
              <BreadcrumbPage>Our Blogs</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground text-center mb-6">
          Our Blogs
        </h1>

        {/* Search */}
        <div className="mb-10">
          <BlogSearch value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
        </div>

        {/* Content */}
        {blogPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FileText className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">Coming Soon!</h2>
            <p className="text-muted-foreground max-w-md">
              We're working on insightful articles about financial forensics and compliance. Stay tuned!
            </p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No blogs found matching "{search}"</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12">
                <Pagination>
                  <PaginationContent>
                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => { e.preventDefault(); setPage(currentPage - 1); }}
                        />
                      </PaginationItem>
                    )}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === currentPage}
                          onClick={(e) => { e.preventDefault(); setPage(p); }}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => { e.preventDefault(); setPage(currentPage + 1); }}
                        />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Blogs;

import { Link } from "react-router-dom";
import { Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { BlogPost } from "@/data/blogPosts";

interface BlogCardProps {
  post: BlogPost;
}

const BlogCard = ({ post }: BlogCardProps) => {
  return (
    <Link to={`/blogs/${post.slug}`} className="group block">
      <article className="rounded-lg border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
        <div className="aspect-[16/9] overflow-hidden">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
        <div className="p-5 flex flex-col flex-1">
          <div className="flex flex-wrap gap-2 mb-3">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent"
              >
                {tag}
              </span>
            ))}
          </div>
          <h3 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2 mb-3">
            {post.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
            {post.description}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <time dateTime={post.publishedAt}>
                {format(new Date(post.publishedAt), "dd MMM yyyy")}
              </time>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {post.readTime}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default BlogCard;

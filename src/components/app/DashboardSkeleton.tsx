
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
        <div>
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 w-[280px]" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div>
                    <Skeleton className="h-7 w-8 mb-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
                <Skeleton className="h-3 w-8" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar Skeleton */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-48" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cases Grid Skeleton */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="h-full">
            <CardContent className="p-4 h-full flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="flex gap-1 mb-3">
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex justify-between items-center mb-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="flex justify-between mt-auto pt-2">
                <div className="flex gap-1">
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-7 w-12" />
                </div>
                <Skeleton className="h-7 w-7" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

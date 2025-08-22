
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between py-6">
        <div>
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-12 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Card className="rounded-2xl">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded" />
                    <div>
                      <Skeleton className="h-8 w-12 mb-1" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-8" />
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Toolbar Skeleton */}
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <Skeleton className="h-10 flex-1 min-w-[220px]" />
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-20" />
              ))}
            </div>
            <Skeleton className="h-8 min-w-[180px]" />
            <Skeleton className="h-8 min-w-[120px]" />
            <Skeleton className="h-8 w-20" />
          </div>
        </CardContent>
      </Card>

      {/* Cases Grid Skeleton */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="w-full min-h-[140px] animate-pulse rounded-2xl shadow-sm">
            <CardContent className="p-4 md:p-5 h-full flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="flex gap-1 mb-4">
                <Skeleton className="h-6 w-12 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex justify-between mt-auto">
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

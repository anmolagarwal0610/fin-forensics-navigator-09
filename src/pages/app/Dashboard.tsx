
import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import CaseCard from "@/components/app/CaseCard";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { getCases, type CaseRecord } from "@/api/cases";
import { toast } from "@/hooks/use-toast";

const STATUS: Array<CaseRecord["status"]> = ["Active", "Processing", "Ready", "Archived"];

export default function Dashboard() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Array<CaseRecord["status"]>>([]);
  const [tagFilter, setTagFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getCases()
      .then((data) => setCases(data))
      .catch((e) => {
        console.error(e);
        toast({ title: "Failed to load cases" });
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const okName = c.name.toLowerCase().includes(search.toLowerCase());
      const okStatus = statusFilter.length ? statusFilter.includes(c.status) : true;
      const okTag = tagFilter ? (c.tags ?? []).some((t) => t.toLowerCase().includes(tagFilter.toLowerCase())) : true;
      return okName && okStatus && okTag;
    });
  }, [cases, search, statusFilter, tagFilter]);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Active Cases</h1>
        <Button onClick={() => navigate("/app/cases/new")}>New Case</Button>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm text-muted-foreground">Search by name</label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Status</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {STATUS.map((s) => {
                const active = statusFilter.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setStatusFilter((prev) =>
                        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                      )
                    }
                    className={`text-xs px-2 py-1 rounded-full border ${active ? "bg-primary/10 border-primary text-primary" : "bg-background hover:bg-muted"}`}
                    aria-pressed={active}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Tag filter</label>
            <Input value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} placeholder="Tag…" />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="p-6">Loading…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-sm text-muted-foreground mb-3">No cases yet.</div>
            <Button variant="cta" onClick={() => navigate("/app/cases/new")}>New Case</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CaseCard
              key={c.id}
              id={c.id}
              name={c.name}
              color_hex={c.color_hex}
              tags={c.tags ?? []}
              status={c.status}
              updated_at={c.updated_at}
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
}

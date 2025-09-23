
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "./StatusBadge";
import { useNavigate } from "react-router-dom";

type Props = {
  id: string;
  name: string;
  color_hex: string;
  tags: string[];
  status: import("@/api/cases").CaseStatus;
  updated_at: string;
};

export default function CaseCard(props: Props) {
  const navigate = useNavigate();
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition"
      onClick={() => navigate(`/app/cases/${props.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: props.color_hex }}
              aria-hidden
            />
            {props.name}
          </CardTitle>
          <StatusBadge status={props.status} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1">
          {props.tags?.map((t) => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Last updated: {new Date(props.updated_at).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

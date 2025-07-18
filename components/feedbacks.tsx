import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { api } from "@/convex/_generated/api";
import { CustomerAvatar } from "./customers";
import { useCustomer } from "@/hooks/auth";
import type { Doc } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function Feedbacks() {
  const record = useQuery(api.myFunctions.listFeedbacks);

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>
          Customer Suggestions
        </CardTitle>
      </CardHeader>

      <CardContent>
        <ul className="flex gap-1 flex-col">
          {record?.data.map(e => {
            return <FeedbackItem key={e._id} entry={e} />;
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * Add Voting Component with Integration
 * @param
 * @returns
 */

function FeedbackItem({ entry: e }: { entry: Doc<'featureRequest'> & { voteCount: number } }) {
  const user = useCustomer({ userId: e.userId });

  return <li key={e._id} className="flex flex-col not-first:border-t py-4">
    <div className="flex gap-8 between border-gray-100 pb-2 items-center text-muted-foreground justify-between text-xs">
      <div className="flex gap-2 items-center">
        <div className={cn("w-min border shadow-inner py-1 px-2 rounded-sm", {
          "text-black": e.status === "open",
          "text-green-500": e.status === "completed",
          "text-red-500": e.status === "rejected",
        })}>
          {e.status}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="w-min">Votes</div>
        <div className={cn("w-min flex gap-2 items-center", {
          'font-semibold': e.voteCount > 0,
        })}>
          {e.voteCount < 0 ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
          <span>{e.voteCount}</span>
        </div>
      </div>
    </div>


    <h1 className="text- font-">{e.title}</h1>


    <p className="text-muted-foreground text-sm leading-[2.4ex]">
      {e.description}
    </p>

    <div className="flex gap-8 mt-2 text-muted-foreground justify-between text-xs">
      <span title={`${user?.firstName} ${user?.lastName}`} className="flex gap-2">
        <CustomerAvatar userId={e.userId} className="w-4 h-4 text-[8px]" />

        <span>
          {user?.firstName}&nbsp;
        </span>
      </span>

      <span>
        {formatDistanceToNow(e._creationTime, { addSuffix: true })}
      </span>
    </div>
  </li>
}

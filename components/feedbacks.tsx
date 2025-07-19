import { useMutation, useQuery } from "convex/react";
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { api } from "@/convex/_generated/api";
import { CustomerAvatar } from "./customers";
import { useCustomer } from "@/hooks/auth";
import type { Doc } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { ArrowBigDown, ArrowBigUp, ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeArray, serialNo } from "@/lib/data.helpers";
import { Slot } from "@radix-ui/react-slot";
import { useAsyncLoader } from "@/hooks/use-loader";

export function Feedbacks() {
  const record = useQuery(api.myFunctions.listFeedbacks, {});

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

export function VotingSection() {
  const result = useQuery(api.myFunctions.listFeedbacks, {
    status: "open"
  });
  const openSuggestions = safeArray(result?.data)

  return (
    <Card className="relative">
      <Image
        alt="3d logo"
        src="/images/3d-bubble.png" width={500} height={500}
        className="absolute w-[2rem] right-8 scale-[2.2] top-0 origin-bottom"
      />
      <CardHeader>
        <CardTitle>Suggestions <span className="section-record-count">
          {serialNo(openSuggestions.length)} </span>
        </CardTitle>
        <CardDescription>
          Help prioritize our service improvements
        </CardDescription>
      </CardHeader>

      <CardContent className="gap-4 flex flex-col">
        {
          safeArray(openSuggestions).map((e) => {
            return <div key={e._id} className="flex group gap-6">
              <div className="flex flex-col mt-1 gap-1 self-start text-base items-center">
                <VoteTrigger value="up" feedbackId={e._id}>
                  <button type="button" className="cursor-pointer text-muted-foreground hover:text-green-500" title="I don't support this">
                    <ArrowBigUp size="1em" />
                  </button>
                </VoteTrigger>

                <span className="font-mono text-[0.8em]">{serialNo(e.voteCount)}</span>

                <VoteTrigger value="down" feedbackId={e._id}>
                  <button type="button" className="cursor-pointer text-muted-foreground hover:text-red-500" title="I support this">
                    <ArrowBigDown size="1em" />
                  </button>
                </VoteTrigger>
              </div>

              <div className="flex flex-col gap-0.5 flex-1 group-last:border-0 border-b pb-8">
                <h6 className="font-semibold">{e.title}</h6>
                <p className="text-sm">{e.description}</p>
                <p className="text-sm text-muted-foreground">{formatDistanceToNow(e._creationTime, { addSuffix: true })}</p>
              </div>
            </div>
          })
        }
        {/* Add voting controls or content here */}
      </CardContent>
    </Card>
  );
}

function VoteTrigger(props: { value: "up" | "down", feedbackId: string, children: React.ReactNode }) {
  const { value, feedbackId: userId } = props;
  const takeVote = useMutation(api.myFunctions.voteFeatureRequest);
  const { loading: isPending, attachLoader } = useAsyncLoader({ default: false });

  return <Slot
    // @ts-expect-error Child will be button
    disabled={isPending.default}
    onClick={attachLoader("default", async () => {
      const dir = {
        up: 1,
        down: -1,
      } as const;

      await takeVote({ entityId: userId, value: dir[value] });
    })}>
    {props.children}
  </Slot >
}

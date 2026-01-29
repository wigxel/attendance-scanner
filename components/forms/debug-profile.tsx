import React from "react";
import { useQuery as useTansackQuery } from "@tanstack/react-query";
import { decodeQRCodeData } from "@/app/actions/encrypt";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { ResizeableQRCode, useGetProfileHash } from "../CheckInCard";
import { safeArray, safeObj } from "@/lib/data.helpers";
import { profile } from "console";
import { useProfile } from "@/hooks/auth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { decode } from "effect/Schema";
import { ScrollArea } from "../ui/scroll-area";

export function DebugProfile(props: { children: React.ReactNode }) {
  const [userId, setValue] = React.useState("");

  return (
    <Dialog>
      <DialogTrigger>{props.children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Debug User QR Code</DialogTitle>
        </DialogHeader>

        <ScrollArea className="-mx-6 p-6">
          <div className="max-h-[60vh] flex flex-col gap-4">
            <Input
              type="text"
              placeholder="Enter User ID"
              onChange={(e) => {
                e.preventDefault();
                setValue(e.target.value);
              }}
            />

            {userId ? <MockGenerateQRCode uid={userId} /> : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function MockGenerateQRCode({ uid }: { uid: string }) {
  const profile = useQuery(api.myFunctions.getUserById, { userId: uid });
  const qr_hash = useGetProfileHash({ id: uid });

  const decodedData = useTansackQuery({
    queryKey: ["debug", uid],
    queryFn: () => decodeQRCodeData(qr_hash.data ?? "none"),
  });

  const encrypted_data = safeArray(decodedData.data);

  return (
    <>
      <ResizeableQRCode hash={qr_hash.data} className="p-0" />
      <section>
        <div>
          <h2 className="font-bold">Profile Info:</h2>
        </div>
        <ul>
          {Object.entries(safeObj(profile)).map(([key, value]) => {
            return (
              <li key={key} className="flex">
                <span className="flex-1 text-start basis-[30%]">{key}</span>
                <span className="flex-1 text-start overflow-hidden grow-0 basis-[80%]">
                  {value}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <div>
          <h2 className="font-bold">Encrypted Data:</h2>
        </div>
        <ul>
          {encrypted_data.length === 0 ? <li>Empty</li> : null}

          {encrypted_data
            .map((e, _index) => [_index, e])
            .map(([key, value]) => {
              return (
                <li key={key} className="flex">
                  <span className="flex-1 font-mono text-start basis-[30%]">
                    {key}
                  </span>
                  <span className="flex-1 text-start overflow-hidden grow-0 basis-[80%]">
                    {value}
                  </span>
                </li>
              );
            })}
        </ul>
      </section>
    </>
  );
}

import { Slot } from "@radix-ui/react-slot";
import { useQuery as useTansackQuery } from "@tanstack/react-query";
import { useMutation, useQuery } from "convex/react";
import React from "react";
import { toast } from "sonner";
import { decodeQRCodeData } from "@/app/actions/encrypt";
import { api } from "@/convex/_generated/api";
import { safeArray, safeObj } from "@/lib/data.helpers";
import { getErrorMessage } from "@/lib/error.helpers";
import { ResizeableQRCode, useGetProfileHash } from "../CheckInCard";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { CustomerCombobox } from "./CustomerCombobox";

export function DebugProfile(props: { children: React.ReactNode }) {
  const [userId, setValue] = React.useState("");

  return (
    <Dialog>
      <DialogTrigger asChild>{props.children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Debug User QR Code</DialogTitle>
        </DialogHeader>

        <ScrollArea className="-mx-6 p-6">
          <div className="max-h-[60vh] flex flex-col gap-4">
            <CustomerCombobox value={userId} onChange={setValue} />

            <div className="flex w-full">
              <RegisterForToday userId={userId}>
                <Button variant={"secondary"}>Register for today</Button>
              </RegisterForToday>
            </div>

            {userId ? <MockGenerateQRCode uid={userId} /> : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function RegisterForToday(props: {
  userId: string;
  children: React.ReactNode;
}) {
  const register = useMutation(api.register.debugRegisterForToday);

  const handleClick = async () => {
    if (!props.userId) {
      toast.error("Please select a customer first");
      return;
    }
    try {
      const result = await register({ userId: props.userId });
      toast.info(result.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return <Slot onClick={handleClick}>{props.children}</Slot>;
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

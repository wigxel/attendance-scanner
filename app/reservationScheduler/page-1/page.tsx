import { SchedulerForm } from "@/components/scheduler";
import { reservationState } from "../shared";
import { useRouter } from "next/router";

export function Page1() {
  const router = useRouter();

  return <SchedulerForm
    defaultValues={undefined}
    // defaultValues={{
    //   selectedDate: { from: new Date(2023, 10, 20), to: new Date(2023, 10, 20) },
    //   duration: "1",
    //   numberOfSeats: 0,
    //   availableSeats: 10
    // }}
    onSubmit={(data) => {
      reservationState.duration = data.duration;
      reservationState.selectedDate = data.selectedDate;
      reservationState.numberOfSeats = data.numberOfSeats;

      router.push('/page-2')
    }}
  />
}

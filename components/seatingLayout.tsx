"use client";

import { TableCfg } from "@/lib/tableData";
import TableComponent from "./table";
import SeatComponent from "./seat";
import { SeatReservationComponentProps } from "./seatReservation";
import { Dispatch, SetStateAction } from "react";
import { SeatStatus } from "./filter";

type ExtendedSeatReservationComponentProps = SeatReservationComponentProps & {
  seatFilter: SeatStatus | undefined; // or whatever type seatFilter is
};
const TableWithSeats: React.FC<ExtendedSeatReservationComponentProps> = ({
  cfg,
  table,
  setTable,
  seat,
  setSeat,
  numberOfSeats,
  reservedSeatsFromDb,
  seatFilter,
}) => (
  <div className={cfg.wrapper}>
    <div className={cfg.container}>
      <TableComponent
        label={cfg.id}
        table={table}
        size={cfg.table.size}
        position={cfg.table.position}
        tableRotation={cfg.table.tableRotation}
        textRotation={cfg.table.textRotation}
      />

      {cfg.seats.map((s) => (
        <SeatComponent
          key={s.option}
          seat={seat}
          seatId={{ seatOption: s.option, name: s.name, setSeat }}
          table={table}
          setTable={setTable}
          numberOfSeats={numberOfSeats}
          positionClasses={s.position}
          seatBarPosition={s.bar}
          textAlignment={s.textAlignment}
          reservedSeatsFromDb={
            reservedSeatsFromDb ? reservedSeatsFromDb : undefined
          }
          seatFilter={seatFilter}
        />
      ))}
    </div>
  </div>
);

// -------------------------------------------------------------------
//  main render section
// -------------------------------------------------------------------

export default function SeatingLayout({
  seat,
  setSeat,
  table,
  setTable,
  numberOfSeats,
  TABLE_LAYOUT,
  reservedSeatsFromDb,
  seatFilter,
}: {
  seat: { seatAllocation: string; label: string; seatStatus: string }[];
  setSeat: (
    s: { seatAllocation: string; label: string; seatStatus: string }[],
  ) => void;
  table: string[];
  setTable: Dispatch<SetStateAction<string[]>>;
  numberOfSeats: number;
  reservedSeatsFromDb?:
    | { seatReservationStatus: string; allocation: string }[]
    | undefined;
  TABLE_LAYOUT: TableCfg[];
  seatFilter?: SeatStatus;
}) {
  return (
    <div className="w-full h-full flex items-center">
      {TABLE_LAYOUT.map((cfg) => (
        <TableWithSeats
          key={cfg.id}
          cfg={cfg}
          table={table}
          setTable={setTable}
          seat={seat}
          setSeat={setSeat}
          numberOfSeats={numberOfSeats}
          setStep={function (value: SetStateAction<string>): void {
            throw new Error("Function not implemented.");
          }}
          TABLE_LAYOUT={[]}
          reservedSeatsFromDb={
            reservedSeatsFromDb ? reservedSeatsFromDb : undefined
          }
          seatFilter={seatFilter}
        />
      ))}
    </div>
  );
}

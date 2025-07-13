import { TableCfg } from "@/lib/tableData";
import TableComponent from "./table";
import SeatComponent from "./seat";
import { SeatReservationComponentProps } from "./seatReservation";
import { Dispatch, SetStateAction } from "react";
import { DateRange } from "react-day-picker";

const TableWithSeats: React.FC<SeatReservationComponentProps> = ({
  cfg,
  table,
  setTable,
  seat,
  setSeat,
  numberOfSeats,
  selectedDate
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
          selectedDate={selectedDate}
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
  selectedDate
}: {
  seat: { seatAllocation: string; label: string, seatStatus: string}[];
  setSeat: (s: { seatAllocation: string; label: string, seatStatus: string }[]) => void;
  table: string[];
  setTable: Dispatch<SetStateAction<string[]>>
  numberOfSeats: number;
  TABLE_LAYOUT: TableCfg[]
  dbSeats: object[]
  selectedDate: DateRange | undefined
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
          } } TABLE_LAYOUT={[]}   
          selectedDate={selectedDate}
        />
      ))}
    </div>
  );
}

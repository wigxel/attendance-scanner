
const TABLE_LAYOUT = [
  {
    // table 1
    id: 'T1',
    wrapper: 'w-1/2 h-full flex justify-center items-center',
    container: 'relative bottom-[65%] left-[25%]',
    table: {
      size: 'w-[51px] h-[99px] rounded-[10px]',
      position: 'left-[calc(50%-25.5px-74px)] top-[45px]',
      tableRotation: '-rotate-90',
      textRotation: '!rotate-90',
    },
    seats: [
      {
        option: 't1s1',
        name: 'S1',
        position: 'left-[calc(50%-8px-105px)] top-[35px] rotate-90',
        bar: 'left-[4px] -top-[25px] rotate-90',
      },
      {
        option: 't1s2',
        name: 'S2',
        position: 'left-[calc(50%-8px-42px)]  top-[35px] rotate-90',
        bar: 'right-[4px] -top-[25px] rotate-90',
      },
    ],
  },
// table 2
  {
    id: 'T2',
    wrapper: 'w-1/2 h-full flex justify-center items-center',
    container: 'relative top-[40%] left-[70%] rotate-90',
    table: {
      size: 'w-[51px] h-[99px] rounded-[10px]',
      position: 'left-[calc(50%-25.5px-74px)] top-[45px]',
      tableRotation: '-rotate-90',
      textRotation: '!rotate-0',
    },
    seats: [
      {
        option: 't2s1',
        name: 'S1',
        position: 'left-[calc(50%-8px-105px)] top-[35px] rotate-90',
        bar: 'left-[4px] -top-[25px] rotate-90',
      },
      {
        option: 't2s2',
        name: 'S2',
        position: 'left-[calc(50%-8px-42px)]  top-[35px] rotate-90',
        bar: 'left-[4px] -top-[25px] rotate-90',
      },
      {
        option: 't2s3',
        name: 'S3',
        position: 'left-[calc(50%-8px-8px)]   top-[80px] rotate-0',
        bar: 'right-[4px] top-[2px] rotate-90',
      },
    ],
  },
//   table 3
  {
    id: 'T3',
    wrapper: "w-1/2 h-full flex justify-center items-center",
    container: 'relative bottom-[65%] left-[25%]',
    table: {
      size: 'w-[83px] h-[158px] rounded-full' ,
      position: 'left-[calc(50%-25.5px-61px)] top-[30px]',
      tableRotation: '-rotate-90',
      textRotation: '!rotate-90',
    },
    seats: [
      {
        option: 't3s1',
        name: 'S1',
        position: "left-[calc(50%-8px-105px)] top-[35px] -rotate-290",
        textAlignment:'!-rotate-90',
        bar: "left-[4px] -top-[25px] rotate-90" ,
      },
      {
        option: 't3s2',
        name: 'S2',
        position: "left-[calc(50%-8px-42px)] top-[35px] rotate-90",
        textAlignment: '!-rotate-90',
        bar: "right-[5px] -top-[25px] rotate-90" ,
      },
      {
        option: 't3s3',
        name: 'S3',
        position: "-left-[calc(50%-8px-0px)] top-[34px] rotate-110",
        textAlignment: '!-rotate-90',
        bar: "left-[6px] -top-[24px] rotate-90" ,
      },
      {
        option: 't3s4',
        name: 'S4',
        position: "left-[calc(50%-8px-105px)] top-[150px] rotate-110",
        textAlignment: '!-rotate-90',
        bar: "left-[8px] top-[2px] rotate-90" ,
      },
      {
        option: 't3s5',
        name: 'S5',
        position: "left-[calc(50%-8px-42px)] top-[155px] rotate-90",
        textAlignment: '!-rotate-90',
        bar: "right-[5px] top-[1px] rotate-90",
      },
      {
        option: 't3s6',
        name: 'S6',
        position: "-left-[calc(50%-8px-0px)] top-[150px] rotate-70",
        textAlignment: '!-rotate-90',
        bar: "left-[7px] top-[1px] rotate-90" ,
      },
    ],
  },
//   table HUB MANAGER
  {
    id: 'Hub Manager',
    wrapper: "w-1/2 h-full flex justify-center items-center",
    container: 'relative top-[40%] left-[70%] rotate-90',
    table: {
      size: 'w-[59px] h-[74px] rounded-[10px]',
      position: 'left-[calc(50%-25.5px-54px)] top-[62px]' ,
      tableRotation: '-rotate-90',
      textRotation: '!rotate-0 text-center',
    },
    seats: [
      {
        option: 'Hub Manager',
        name: 'S1',
        position: "left-[calc(50%-8px-52px)] top-[35px] rotate-90",
        textAlignment: '!-rotate-90',
        bar: "left-[5px] -top-[24px] rotate-90" ,
      },
    ],
  },
//   table 4
  {
    id: 'T4',
    wrapper: "w-1/2 h-full flex justify-center items-center",
    container: 'relative bottom-[65%] left-[25%]',
    table: {
      size: 'w-[83px] h-[158px] rounded',
      position: 'left-[calc(50%-25.5px-61px)] top-[30px]',
      tableRotation: '-rotate-90',
      textRotation: '!rotate-90',
    },
    seats: [
      {
        option: 't4s1',
        name: 'S1',
        position: "left-[calc(50%-8px-105px)] top-[35px] rotate-90",
        textAlignment:'!-rotate-90',
        bar: "left-[5px] -top-[25px] rotate-90"  ,
      },
      {
        option: 't4s2',
        name: 'S2',
        position: "left-[calc(50%-8px-42px)] top-[35px] rotate-90",
        textAlignment: '!-rotate-90',
        bar: "right-[5px] -top-[25px] rotate-90" ,
      },
      {
        option: 't4s3',
        name: 'S3',
        position: "-left-[calc(50%-8px-0px)] top-[34px] rotate-90",
        textAlignment: '!-rotate-90',
        bar: "left-[6px] -top-[24px] rotate-90" ,
      },
      {
        option: 't4s4',
        name: 'S4',
        position: "left-[calc(50%-8px-105px)] top-[150px] rotate-90",
        textAlignment: '!-rotate-90',
        bar: "left-[8px] top-[2px] rotate-90" ,
      },
      {
        option: 't4s5',
        name: 'S5',
        position: "left-[calc(50%-8px-42px)] top-[150px] rotate-90",
        textAlignment: '!-rotate-90',
        bar: "right-[5px] top-[1px] rotate-90" ,
      },
      {
        option: 't4s6',
        name: 'S6',
        position: "-left-[calc(50%-8px-0px)] top-[150px] rotate-90",
        textAlignment: '!-rotate-90',
        bar: "left-[7px] top-[1px] rotate-90" ,
      },
    ],
  },
// table 5
  {
    id: 'T5',
    wrapper: "w-1/2 h-full flex justify-center items-center",
    container: 'relative top-[40%] -right-[135%] rotate-90',
    table: {
      size: 'w-[59px] h-[114px] rounded-[10px]',
      position: 'left-[calc(50%-25.5px-40px)] top-[35px]',
      tableRotation: '-rotate-90',
      textRotation: '!rotate-0',
    },
    seats: [
      {
        option: 't5s1',
        name: 'S1',
        position: "left-[calc(50%-8px-75px)] top-[30px] rotate-90",
        textAlignment: '!-rotate-90',
        bar: "left-[4px] -top-[25px] rotate-90",
      },
      {
        option: 't5s2',
        name: 'S2',
        position: "right-[calc(50%-8px-4px)] top-[30px] rotate-90",
        textAlignment: '!-rotate-90',
        bar: "right-[4px] -top-[25px] rotate-90" ,
      },
      {
        option: 't5s3',
        name: 'S3',
        position: "left-[calc(50%-8px-110px)] top-[75px] rotate-0",
        textAlignment: '!-rotate-90',
        bar: "right-[4px] -top-[23px] rotate-90",
      },
    ],
  },
];

// -------------------------------------------------------------------
// wrapper for table sections
// -------------------------------------------------------------------
interface SeatCfg {
  textAlignment: string;
  option: string;
  name:  string;
  position: string;
  bar: string;
}

interface TableCfg {
  id: string;
  wrapper: string;
  container: string;
  table: {
    size: string;
    position: string;
    tableRotation: string;
    textRotation: string;
  };
  seats: SeatCfg[];
}

type Props = {
  cfg: TableCfg;
  table: string[];
  setTable: (t: string[]) => void;
  seat: { option: string; name: string }[];
  setSeat: (s: { option: string; name: string }[]) => void;
  numberOfSeats: number;
};

const TableWithSeats: React.FC<Props> = ({
  cfg,
  table,
  setTable,
  seat,
  setSeat,
  numberOfSeats,
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
          seatId={{ seatOption: s.option, name: s.name }}
          setSeat={setSeat}
          table={table}
          setTable={setTable}
          numberOfSeats={numberOfSeats}
          positionClasses={s.position}
          seatBarPosition={s.bar}
          textAlignment={s.textAlignment}
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
}: {
  seat: { option: string; name: string }[];
  setSeat: (s: { option: string; name: string }[]) => void;
  table: string[];
  setTable: (t: string[]) => void;
  numberOfSeats: number;
}) {
  return (
    <div className="w-full h-fit space-y-12">
      {TABLE_LAYOUT.map((cfg) => (
        <TableWithSeats
          key={cfg.id}
          cfg={cfg}
          table={table}
          setTable={setTable}
          seat={seat}
          setSeat={setSeat}
          numberOfSeats={numberOfSeats}
        />
      ))}
    </div>
  );
}

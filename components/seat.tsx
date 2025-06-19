// Seat.tsx
export const Seat = ({ table, currentTable, seatId, positionClasses, seatBarPosition }: any) => (
  <button
    type='button'
    onClick={() => {
      if (table === currentTable) seatId.setSeat(seatId.name);
    }}
    className={`absolute w-4 h-[31px] ${positionClasses} cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)`}>
    <span className='!-rotate-90 text-xs'>
      {seatId.name}
      <div className={`absolute w-1 h-[39px] ${seatBarPosition} bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)`} />
    </span>
  </button>
);

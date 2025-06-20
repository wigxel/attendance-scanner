
interface SeatId {
    name: string;
    seatOption:string
    setSeat: (name: string[]) => void;
}

interface SeatComponentProps{
    currentTable: string
    seat: string[]
    seatId: SeatId
    tableSeatOptions:string[]
    positionClasses: string
    seatBarPosition: string
    textAlignment: string
}

export default function SeatComponent(
    { 
        currentTable, seat, seatId, 
        positionClasses, seatBarPosition,
        textAlignment, tableSeatOptions
    }: SeatComponentProps
) {

    const buttonClasses = `absolute w-4 h-[31px] ${positionClasses} cursor-pointer flex items-center justify-center rounded group border hover:border-[var(--primary)] ${seat.includes(seatId.seatOption) ? 'bg-[var(--primary)]' : 'bg-[#D9D9D9]'}`;
    const barClasses = `absolute w-1 h-[39px] ${seatBarPosition} rounded border group-hover:border-[var(--primary)] ${seat.includes(seatId.seatOption) ? 'bg-[var(--primary)]' : 'bg-[#D9D9D9]'}`;

  return (
    <button
        type='button'
        onClick={() => {
            //if the user clicks a button, then let them choose from the list of seats options for that table only
            if (currentTable && tableSeatOptions.includes(seatId.seatOption)) {
                // If seat is already selected, remove it
                if (seat.includes(seatId.seatOption)) {
                    seatId.setSeat(seat.filter((s) => (s !== seatId.seatOption && s !== seatId.name)));
                } else {
                    // Otherwise, add it
                    seatId.setSeat([...seat, seatId.seatOption, seatId.name]);
                }
            }
        }}
        className={buttonClasses}
    >
        <span className={`${textAlignment} text-xs ${seat.includes(seatId.seatOption) && 'text-white'}` }>
            {seatId.name}
            {/* seat bar */}
            <div 
                className={barClasses} 
            />
        </span>
    </button>
  )
}

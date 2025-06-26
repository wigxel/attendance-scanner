import { Dispatch, SetStateAction, useEffect } from "react";
import Toast from "./toast";

interface SeatId {
    name: string;
    seatOption:string
    setSeat: (name: string[]) => void;
}

interface SeatComponentProps{
    currentTable: string
    seat: string[]
    seatId: SeatId
    table: string[]
    setTable: Dispatch<SetStateAction<string[]>>
    tableSeatOptions:string[]
    positionClasses: string
    seatBarPosition: string
    textAlignment: string
}

export default function SeatComponent(
    { 
        seat, seatId, 
        positionClasses, seatBarPosition,
        textAlignment, table, setTable
    }: SeatComponentProps
) {
    // Removed updateSeat state as it's unnecessary
    const buttonClasses = `absolute w-4 h-[31px] ${positionClasses} cursor-pointer flex items-center justify-center rounded group border hover:border-[var(--primary)] ${seat.includes(seatId.seatOption) ? 'bg-[var(--primary)]' : 'bg-[#D9D9D9]'}`;
    const barClasses = `absolute w-1 h-[39px] ${seatBarPosition} rounded border group-hover:border-[var(--primary)] ${seat.includes(seatId.seatOption) ? 'bg-[var(--primary)]' : 'bg-[#D9D9D9]'}`;

    const tableSeatOptions: { id: string; options: string[] }[] = [
        {id: 'T1', options: ['t1s1', 't1s2']},
        {id: 'T2', options: ['t2s1', 't2s2','t2s3']},
        {id: 'T3', options: ['t3s1', 't3s2', 't3s3', 't3s4', 't3s5', 't3s6' ]},
        {id: 'Hub Manager', options: ['Hub Manager']},
        {id: 'T4', options: ['t4s1', 't4s2', 't4s3', 't4s4', 't4s5', 't4s6']},
        {id: 'T5', options: ['t5s1', 't5s2', 't5s3']},
    ]
    const handleSeatSelection = () =>{
        //if the user clicks a button, then let them choose from the list of seats regardless of the table
        const selectedSeats = seat.filter((_, index) => index % 2 === 0); // seatOptions only
        
        const isAlreadySelected = seat.includes(seatId.seatOption);

        if (isAlreadySelected) {
            // Remove both seatOption and name
            seatId.setSeat(seat.filter((s) => s !== seatId.seatOption && s !== seatId.name));
        } else {
            // Only add if selection limit not exceeded
            if (selectedSeats.length < 6) {
                seatId.setSeat([...seat, seatId.seatOption, seatId.name]);
                // No need to call deriveTables here, handled in useEffect
            } else {
                Toast({ type: 'warning', message: 'Maximum seat selection reached.' })
            }
        }
    }
    
    const handleTableSelection = (
        seatOptions: string[]
    ): string[] => {
        //1.Find every table whose seat list intersects the incoming seatOptions
        const matchingTableIds = tableSeatOptions
            .filter(({ options }) =>
                options.some(opt => seatOptions.includes(opt))
            )
            .map(({ id }) => id);

        // Remove duplicates by using a Set
        const merged = new Set([...table, ...matchingTableIds]);
        
        return Array.from(merged);
    }

    useEffect(() => {
        // get the options for every seat
        const selectedSeatOptions = seat.filter((_, i) => i % 2 === 0);
        setTable(handleTableSelection(selectedSeatOptions));

        // if there are no seats, empty the table array
        if(selectedSeatOptions.length === 0){
            setTable([])
        }
    }, [seat, setTable]);

    console.log('table = '+table, 'seat = '+seat)

  return (
    <button
        type='button'
        onClick={() => {
            handleSeatSelection()
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

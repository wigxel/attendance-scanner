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
        seat, seatId, currentTable,
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
    
    /**
     * operation;
     * 1: user picks a seat and seat name and seatOption #should be renamed# gets added to the seat array
     * 2: when there is a seat, table function checks if the seatOption matches one if its options #matchingIDs# and if it does, the table gets added to the table array
     * 3: a merge is performed to remove remove duplicates by merging IDs in the table array with incoming matchingIDs, i.e. don't add additional table option if it already exist in table
     *     
     */

    const selectedSeats = () =>{
        return seat.filter((_, index) => index % 2 === 0); 
    }
    const getSeatOptions = () =>{
        
        return seat.filter(s => s.startsWith('t') || s.startsWith('H'))
    }
    // function to handle user seat selection
    const handleSeatSelection = () =>{
        //if the user clicks a button, then let them choose from the list of seats regardless of the table
        const selectedSeatOptions =  selectedSeats()// seatOptions only
        
        const isAlreadySelected = seat.includes(seatId.seatOption);
        
        if (isAlreadySelected) {
            // Remove both seatOption and name
            seatId.setSeat(seat.filter((s) => s !== seatId.seatOption && s !== seatId.name));
            //trigger table deselection on click
        } else {
            selectedSeats()
            // Only add if selection limit not exceeded
            if (selectedSeatOptions.length < 6) {
                seatId.setSeat([...seat, seatId.seatOption, seatId.name]);
                // No need to call deriveTables here, handled in useEffect
            } else {
                Toast({ type: 'warning', message: 'Maximum seat selection reached.' })
            }
        }
    }
    
    // function to handle table selection when user picks a seat
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

    const handleTableDeselect = (selectedSeatOptions: string[]) =>{

        //if the user clicks a button, then let them choose from the list of seats regardless of the table
        
        // Keep every table that still owns ≥1 selected seat
        const matchingTableIds = tableSeatOptions
            .filter(({ options }) =>
                options.some(opt => selectedSeatOptions.includes(opt))
            )
            .map(({ id }) => id);

        setTable(matchingTableIds); // no accidental nesting
    }

    useEffect(() => {
        // table selection trigger

        // get the options for every seat
        const selectedSeatOptions = getSeatOptions()

        setTable(handleTableSelection(selectedSeatOptions));

        handleTableDeselect(selectedSeatOptions)
        
    }, [seat, setTable]);
    
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
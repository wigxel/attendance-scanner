import { Dispatch, SetStateAction, useEffect, useState } from "react";
import Toast from "./toast";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DateRange } from "react-day-picker";

export interface SeatObject {
    label: string;
    seatAllocation: string;
    seatStatus: string;
}

export interface SeatId {
    name: string;
    seatOption: string;
    setSeat: (seat: SeatObject[]) => void;
}

interface SeatComponentProps{
    seat: SeatObject[]
    seatId: SeatId
    table: string[]
    numberOfSeats: number
    setTable: Dispatch<SetStateAction<string[]>>
    positionClasses: string
    seatBarPosition: string
    textAlignment: string
    selectedDate: DateRange | undefined
    // dbSeats: { status?: string; seatOption?: string }[]
}

export default function SeatComponent(
    { 
        seat, seatId, numberOfSeats,
        positionClasses, seatBarPosition,
        textAlignment, table, setTable, selectedDate
    }: SeatComponentProps
) {

    const [seatStatus, setSeatStatus] = useState<(string | undefined)[]>([])
    
    //check is seat option identifier is included in the seat array to determine styling
    // check if seat is available and a match to determine styling
    
    // compute relevant states
    const isSelected = seat.some(item => item.seatAllocation.includes(seatId.seatOption));
    // const dbSeats = useQuery(api.seatReservation.getAllSeatReservations, { selectedDate  });
    // find the seat in the dbSeats array
    // const dbSeat = dbSeats && dbSeats.find((item) => item.seatOption === seatId.seatOption);
    // const isUnavailable = dbSeat && dbSeat.status !== 'seatAvailable'

    // Conditionally build class strings
    const seatBg = isSelected ? 'bg-[var(--primary)] text-white' : 'bg-[#D9D9D9] text-[var(--primary)]';
    // const seatUnavailable = isUnavailable ?  'bg-[var(--primary)] text-white' : 'bg-[#D9D9D9] text-[var(--primary)]';;

    const buttonClasses = `
        absolute w-4 h-[31px] ${positionClasses} cursor-pointer flex items-center justify-center rounded group border hover:border-[var(--primary)]
        ${seatBg} 
    `;
    //${seatUnavailable} ie {seatBg} ${seatUnavailable}

    const barClasses = `
        absolute w-1 h-[39px] ${seatBarPosition} rounded border group-hover:border-[var(--primary)]
        ${seatBg}
    `;
    //${seatUnavailable} ie {seatBg} ${seatUnavailable}
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
     * 3: a merge is performed to remove duplicates by merging IDs in the table array with incoming matchingIDs, i.e. don't add additional table option if it already exist in table
     *     
     */

    // const selectedSeats = () =>{
    //     return seat.filter((_, index) => index % 2 === 0); 
    // }

    const getSeatOptions = () =>{
        
        return seat.filter(s => s.seatAllocation.startsWith('t') || s.seatAllocation.startsWith('H')).map((s) => s.seatAllocation);
        
    }

    // function to handle user seat selection
    const handleSeatSelection = () =>{
        //if the user clicks a button, then let them choose from the list of seats regardless of the table
        const currentSeat = { seatAllocation: seatId.seatOption, label: seatId.name, seatStatus: 'seatReserved'};

        const isAlreadySelected = seat.some(
            (s) => s.seatAllocation === currentSeat.seatAllocation && s.label === currentSeat.label
        );

        if (isAlreadySelected) {
            // Remove the seat by both option and name
            const updatedSeats = seat.filter(
                (s) => !(s.seatAllocation === currentSeat.seatAllocation && s.label === currentSeat.label)
            );
            seatId.setSeat(updatedSeats);
        } else {
            // selectedSeats()
            // Only add if selection limit not exceeded
            if (seat.length < numberOfSeats) {
                seatId.setSeat([...seat,currentSeat]);
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

        // b. Merge with tables already selected, dedup with a Set
        const mergedTableIds = Array.from(new Set([...table, ...matchingTableIds]));


        return mergedTableIds; // return updated list so caller can setTable
    }

    const handleTableDeselect = (seatOptions: string[]) =>{

        //if the user clicks a button, then let them choose from the list of seats regardless of the table
        
        // Keep every table that still owns ≥1 selected seat
        const stillSelectedIds  = tableSeatOptions
            .filter(({ options }) =>
                options.some(opt => seatOptions.includes(opt))
            )
            .map(({ id }) => id);
        setTable(stillSelectedIds ); // no accidental nesting
    }

    useEffect(() => {
        // table selection trigger

        // get the options for every seat
        const seatOptions = getSeatOptions()

        setTable(handleTableSelection(seatOptions));

        handleTableDeselect(seatOptions)
        
    }, [seat, setTable]);

    useEffect(() => {
        // const allSeat = dbSeats && dbSeats.map((item: { status?: string }) => item);
        // setSeatStatus(allSeat as (string | undefined)[]);
    }, [])

  return (
    <button
        type='button'
        onClick={() => {
            // if the seat is available, then handle seat selection
            // dbSeats.map((item: { status?: string, seatOption?: string }) => ((item.seatOption === seatId.seatOption && item.status === 'seatAvailable') ? handleSeatSelection() : false));
            handleSeatSelection()
        }}
        className={buttonClasses}
    >
        <span className={`${textAlignment} text-xs ${seat.some(s => s.seatAllocation === seatId.seatOption) && 'text-white'}` }>
            {seatId.name}
            {/* seat bar */}
            <div 
                className={barClasses} 
            />
        </span>
    </button>
  )
}


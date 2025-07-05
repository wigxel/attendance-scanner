'use client'

import { useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import RadioFilterComponent from '@/components/filter'
import ReservationNavigationComponent from './reservationNavigation';
import ToastComponentProps from './toast';
import { SeatObject } from './seat';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SeatStatus } from '@/convex/seats';
import { TABLE_LAYOUT_SECTION_1, TABLE_LAYOUT_SECTION_2, TABLE_LAYOUT_SECTION_3, TableCfg } from '@/lib/tableData' //data for refactored table;
import SeatingLayout from './seatingLayout';//refactored seating layout which calls the table and seats components;

export interface SeatReservationComponentProps {
    setStep: Dispatch<SetStateAction<string>>;
    table: string[];
    setTable: Dispatch<SetStateAction<string[]>>;
    seat: SeatObject[];
    setSeat: (s: { option: string; name: string }[]) => void;
    numberOfSeats: number
    cfg: TableCfg;
    TABLE_LAYOUT: Array<object>
    dbSeats: object[]
}

// each table has seat options and each seat has an optionId assigned to it for the table it belongs
export default function SeatReservationComponent(
    {
        setStep, numberOfSeats,
        table, setTable,
        seat, setSeat
    }: SeatReservationComponentProps
) {
    
    const [seatFilter, setSeatFilter] = useState<SeatStatus>('seatAvailable')

    // fetch all the seats from our db using the filter
    const dbSeats = useQuery(api.seats.getAllSeats, { seatFilter })

    const { isAuthenticated } = useConvexAuth();
    const router = useRouter();

    // useEffect(() => {
    //     // If user is not authenticated, redirect to sign-in page
    //     if (!isAuthenticated) {
    //     router.push("/userLogin");
    //     }
    // }, [isAuthenticated, router])
    
    // confirms that all necessary fields are filled before loading the next component
    // if a seat is selected
    const handleNextStep = () =>{
        if(seat.length === 0){
            ToastComponentProps({ type: 'error', message: 'Kindly select a table and a seat(s)' })
            return false
        }else{
            return setStep('reservationSummary')
        }
    }
    // filter
    const filterOptions = [
        {id: 'seatReserved', checker: 'seatReserved', label: 'Reserved'},
        {id: 'seatSelected', checker: 'seatSelected', label: 'Selected'},
        {id: 'seatAvailable', checker: 'seatAvailable', label: 'Available'}
    ]

  return (
    <section className="w-full h-fit flex justify-center items-start p-4 xl:p-0 mt-10 xl:mt-0" >
        {/* navigation for component rendering  */}
        <ReservationNavigationComponent step='scheduler' setStep={setStep}/>
        <div className={"w-[335px] sm:w-[335px] h-fit flex flex-col justify-center items-center"}>
            
            {/* reservation */}
            <div className='w-[335px] max-w-[335px] h-11 flex items-center justify-center mt-24'>
                {/* filter to see seat availability, selection or already reserved seats */}
                <div className='w-full flex justify-between items-center'>
                    {
                        filterOptions.map((item, index) => (
                            <RadioFilterComponent 
                                key={index} 
                                id={item.id} 
                                label={item.label} 
                                name='seatFilter'
                                value={item.checker as SeatStatus}//default checked filter value
                                checker={seatFilter} 
                                onChange={setSeatFilter}
                            />
                        ))
                    }
                </div>
    
            </div>
    
            {/* section 1 */}
            <div className='w-full sm:max-w-[335px] h-[150px] sm:max-h-[150px] flex justify-between items-center'>
                {/* first table, Second table and seat allocation */}
                <div className="w-full h-full flex justify-between items-center">
    
                    <SeatingLayout 
                        seat={seat}
                        setSeat={setSeat}
                        table={table}
                        setTable={setTable}
                        numberOfSeats={numberOfSeats}
                        TABLE_LAYOUT={TABLE_LAYOUT_SECTION_1}
                        dbSeats={dbSeats ?? []}
                    />
                    
                </div>
            </div>
    
            {/* section 2 */}
            <div className='w-full sm:max-w-[335px] h-[150px] sm:max-h-[150px] flex justify-between items-center my-12'>
                {/* third table, fourth table and seat allocation */}
                
                <SeatingLayout 
                    seat={seat}
                    setSeat={setSeat}
                    table={table}
                    setTable={setTable}
                    numberOfSeats={numberOfSeats}
                    TABLE_LAYOUT={TABLE_LAYOUT_SECTION_2}
                    dbSeats={dbSeats ?? []}
                />

            </div>
    
            {/* section 3 */}
            <div className='w-full sm:max-w-[335px] h-[150px] sm:max-h-[150px] flex justify-between items-center mb-[110px]'>
                {/* fifth table, sixth table and seat allocation */}
                
                <SeatingLayout 
                    seat={seat}
                    setSeat={setSeat}
                    table={table}
                    setTable={setTable}
                    numberOfSeats={numberOfSeats}
                    TABLE_LAYOUT={TABLE_LAYOUT_SECTION_3}
                    dbSeats={dbSeats ?? []}
                />
                    
            </div>
    
            <button 
                type="button" 
                className="w-full h-8 text-xs font-semibold bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm"
                onClick={
                    () => handleNextStep()
                }
            >
                Confirm and Proceed
            </button>
        </div>
            
    </section>
  )
}

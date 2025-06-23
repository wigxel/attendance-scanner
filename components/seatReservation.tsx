'use client'

import { useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import RadioFilterComponent from '@/components/filter'
import SeatComponent from '@/components/seat'
import TableComponent from '@/components/table'
import ReservationNavigationComponent from './reservationNavigation';
import ToastComponentProps from './toast';

interface SeatReservationComponentProps {
    setStep: Dispatch<SetStateAction<string>>;
    table: string;
    setTable: Dispatch<SetStateAction<string>>;
    seat: string[];
    setSeat: Dispatch<SetStateAction<string[]>>;
}

// interface FormData {
//     filter: string
// }

// each table has seat options and each seat has an optionId assigned to it for the table it belongs
export default function SeatReservationComponent(
    {
        setStep,
        table, setTable,
        seat, setSeat
    }: SeatReservationComponentProps
) {

    const { isAuthenticated } = useConvexAuth();
    const router = useRouter();

    const [tableSeatOptions, setTableSeatOptions] = useState<string[]>([])
    const [seatFilter, setSeatFilter] = useState('seatAvailable')

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
            ToastComponentProps({ type: 'error', message: 'Kindly select a' })
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
                                value={item.checker}//default checked filter value
                                checker={seatFilter} 
                                onChange={setSeatFilter}
                            />
                        ))
                    }
                </div>
    
            </div>
    
            {/* section 1 */}
            <div className='w-full sm:max-w-[335px] h-[150px] sm:max-h-[150px] flex justify-between items-center'>
                {/* first table and seats */}
                <div className="w-1/2 h-full flex justify-center items-center">
    
                    <div className='relative bottom-[65%] left-[25%]'> 
                        {/* Table T1 */}
                        
                        <TableComponent 
                            id='T1' 
                            label='T1' 
                            seatOptions={['t1s1', 't1s2']} //list of seats for each table
                            setTable={setTable}//sets selected table
                            setTableSeatOptions={setTableSeatOptions}//sets table seat options
                            table={table}//users selected table 
                            setSeat={setSeat}
                            size='w-[51px] h-[99px] rounded-[10px]' 
                            position='left-[calc(50%-25.5px-74px)] top-[45px]' 
                            tableRotation='-rotate-90'
                            textRotation='!rotate-90'
                        />

                        {/* Seat S1 */}
                        
                        <SeatComponent 
                            seat={seat}
                            seatId={{ seatOption: 't1s1', name: 'S1', setSeat }}
                            tableSeatOptions={tableSeatOptions}//available options for parent table
                            positionClasses="left-[calc(50%-8px-105px)] top-[35px] rotate-90"
                            textAlignment='!-rotate-90'
                            seatBarPosition="left-[4px] -top-[25px] rotate-90" 
                            currentTable='T1'                          
                        />
    
                        {/* Seat S2 */}
                        <SeatComponent 
                            seat={seat}
                            seatId={{ seatOption: 't1s2', name: 'S2', setSeat }}
                            tableSeatOptions={tableSeatOptions}//available options for parent table
                            positionClasses="left-[calc(50%-8px-42px)] top-[35px] rotate-90"
                            textAlignment='!-rotate-90'
                            seatBarPosition="right-[4px] -top-[25px] rotate-90" 
                            currentTable='T1'                          
                        />
                    </div>
                </div>
                {/* Second table and seats */}
                <div className="w-1/2 h-full flex justify-center items-center">
    
                    <div className='relative top-[40%] left-[70%] rotate-90'>
                        {/* Table T2 */}
                        
                        <TableComponent 
                            id='T2' 
                            label='T2' 
                            seatOptions={['t2s1', 't2s2','t2s3']} //list of seats for each table
                            setTable={setTable}//sets selected table
                            setTableSeatOptions={setTableSeatOptions}//sets table seat options
                            table={table}
                            setSeat={setSeat}
                            size='w-[51px] h-[99px] rounded-[10px]' 
                            position='left-[calc(50%-25.5px-74px)] top-[45px]' 
                            tableRotation='-rotate-90'
                            textRotation='!rotate-0'
                        />
    
                        {/* Seat S1 */}
                        <SeatComponent 
                            seat={seat}
                            seatId={{ seatOption: 't2s1', name: 'S1', setSeat }}
                            tableSeatOptions={tableSeatOptions}//available options for parent table
                            positionClasses="left-[calc(50%-8px-105px)] top-[35px] rotate-90"
                            textAlignment='!-rotate-90'
                            seatBarPosition="left-[4px] -top-[25px] rotate-90" 
                            currentTable='T2'                          
                        />
    
                        {/* Seat S2 */}
                        <SeatComponent 
                            seat={seat}
                            seatId={{ seatOption: 't2s2', name: 'S2', setSeat }}
                            tableSeatOptions={tableSeatOptions}//available options for parent table
                            positionClasses="left-[calc(50%-8px-42px)] top-[35px] rotate-90"
                            textAlignment='!-rotate-90'
                            seatBarPosition="left-[4px] -top-[25px] rotate-90" 
                            currentTable='T2'                          
                        />
    
                        {/* Seat S3 */}
                        <SeatComponent 
                            seat={seat}
                            seatId={{ seatOption: 't2s3', name: 'S3', setSeat }}
                            tableSeatOptions={tableSeatOptions}//available options for parent table
                            positionClasses="left-[calc(50%-8px-8px)] top-[80px] rotate-0"
                            textAlignment='!-rotate-90'
                            seatBarPosition="right-[4px] top-[2px] rotate-90" 
                            currentTable='T2'                          
                        />
    
                    </div>
                    
                </div>
            </div>
    
            {/* section 2 */}
            <div className='w-full sm:max-w-[335px] h-[150px] sm:max-h-[150px] flex justify-between items-center my-12'>
                {/* third table and seats */}
                <div className="w-1/2 h-full flex justify-center items-center">
    
                    <div className='relative bottom-[65%] left-[25%]'> 
                        {/* Table T3 */}
                        <TableComponent 
                            id='T3' 
                            label='T3' 
                            table={table}
                            seatOptions={['t3s1', 't3s2', 't3s3', 't3s4', 't3s5', 't3s6' ]}//list of seats for each table
                            setTable={setTable}//sets selected table
                            setTableSeatOptions={setTableSeatOptions}//sets table seat options
                            setSeat={setSeat}
                            size='w-[83px] h-[158px] rounded-full' 
                            position='left-[calc(50%-25.5px-61px)] top-[30px]' 
                            tableRotation='-rotate-90'
                            textRotation='!rotate-90'
                        />
    
                        {/* Seat S1 */}
                        <SeatComponent 
                            seat={seat}
                            seatId={{ seatOption: 't3s1', name: 'S1', setSeat }}
                            tableSeatOptions={tableSeatOptions}//available options for parent table
                            positionClasses="left-[calc(50%-8px-105px)] top-[35px] -rotate-290"
                            textAlignment='!-rotate-90'
                            seatBarPosition="left-[4px] -top-[25px] rotate-90" 
                            currentTable='T3'                          
                        />
    
                        {/* Seat S2 */}

                        <SeatComponent 
                            seat={seat}
                            seatId={{ seatOption: 't3s2', name: 'S2', setSeat }}
                            tableSeatOptions={tableSeatOptions}//available options for parent table
                            positionClasses="left-[calc(50%-8px-42px)] top-[35px] rotate-90"
                            textAlignment='!-rotate-90'
                            seatBarPosition="right-[5px] -top-[25px] rotate-90" 
                            currentTable='T3'                          
                        />
    
                        {/* Seat S3 */}

                        <SeatComponent 
                            seat={seat}
                            seatId={{ seatOption: 't3s3', name: 'S3', setSeat }}
                            tableSeatOptions={tableSeatOptions}//available options for parent table
                            positionClasses="-left-[calc(50%-8px-0px)] top-[34px] rotate-110"
                            textAlignment='!-rotate-90'
                            seatBarPosition="left-[6px] -top-[24px] rotate-90" 
                            currentTable='T3'                          
                        />
    
                        {/* Seat S4 */}
                        <SeatComponent 
                            seat={seat}
                            seatId={{ seatOption: 't3s4', name: 'S4', setSeat }}
                            tableSeatOptions={tableSeatOptions}//available options for parent table
                            positionClasses="left-[calc(50%-8px-105px)] top-[150px] rotate-110"
                            textAlignment='!-rotate-90'
                            seatBarPosition="left-[8px] top-[2px] rotate-90" 
                            currentTable='T3'                          
                        />
    
                        {/* Seat S5 */}

                        <SeatComponent 
                            seat={seat}
                            seatId={{ seatOption: 't3s5', name: 'S5', setSeat }}
                            tableSeatOptions={tableSeatOptions}//available options for parent table
                            positionClasses="left-[calc(50%-8px-42px)] top-[155px] rotate-90"
                            textAlignment='!-rotate-90'
                            seatBarPosition="right-[5px] top-[1px] rotate-90" 
                            currentTable='T3'                          
                        />
    
                        {/* Seat S6 */}
                        <SeatComponent 
                            seat={seat}
                            seatId={{ seatOption: 't3s6', name: 'S6', setSeat }}
                            tableSeatOptions={tableSeatOptions}//available options for parent table
                            positionClasses="-left-[calc(50%-8px-0px)] top-[150px] rotate-70"
                            textAlignment='!-rotate-90'
                            seatBarPosition="left-[7px] top-[1px] rotate-90" 
                            currentTable='T3'                          
                        />
    
                    </div>
                </div>
                {/* fourth table and seats */}
                <div className="w-1/2 h-full flex justify-center items-center">
    
                    <div className='relative top-[40%] left-[70%] rotate-90'>
                        {/* (fourth) Table Hub Manager */}
                        
                        <TableComponent 
                            id='Hub Manager' 
                            label='Hub Manager' 
                            seatOptions={['Hub Manager']} //list of seats for each table
                            table={table}
                            setSeat={setSeat}
                            setTable={setTable}//sets selected table
                            setTableSeatOptions={setTableSeatOptions}//sets table seat options
                            size='w-[59px] h-[74px] rounded-[10px]' 
                            position='left-[calc(50%-25.5px-54px)] top-[62px]' 
                            tableRotation='-rotate-90'
                            textRotation='!rotate-0 text-center'
                        />

                        {/* Seat S1 */}
                        <SeatComponent 
                            seat={seat}
                            seatId={{ seatOption: 'Hub Manager', name: 'S1', setSeat }}
                            tableSeatOptions={tableSeatOptions}//available options for parent table
                            positionClasses="left-[calc(50%-8px-52px)] top-[35px] rotate-90"
                            textAlignment='!-rotate-90'
                            seatBarPosition="-left-[1px] -top-[32px] rotate-90" 
                            currentTable='Hub Manager'                          
                        />
    
                    </div>
                    
                </div>
            </div>
    
            {/* section 3 */}
            <div className='w-full sm:max-w-[335px] h-[150px] sm:max-h-[150px] flex justify-between items-center mb-[110px]'>
                {/* fifth table and seats */}
                <div className="w-1/2 h-full flex justify-center items-center">
    
                    <div className='relative bottom-[65%] left-[25%]'> 
                        {/* Table T4 */}

                        <TableComponent 
                            id='T4' 
                            label='T4' 
                            seatOptions={['t5s1', 't5s2', 't5s3', 't5s4', 't5s5', 't5s6']} 
                            table={table}
                            setTable={setTable}//sets selected table
                            setTableSeatOptions={setTableSeatOptions}//sets table seat options
                            setSeat={setSeat}
                            size='w-[83px] h-[158px] rounded' 
                            position='left-[calc(50%-25.5px-61px)] top-[30px]' 
                            tableRotation='-rotate-90'
                            textRotation='!rotate-90'
                        />
    
                        {/* Seat S1 */}
                        <SeatComponent 
                            seat={seat}
                            seatId={{ seatOption: 't5s1', name: 'S1', setSeat }}
                            tableSeatOptions={tableSeatOptions}//available options for parent table
                            positionClasses="left-[calc(50%-8px-105px)] top-[35px] rotate-90"
                            textAlignment='!-rotate-90'
                            seatBarPosition="left-[5px] -top-[25px] rotate-90" 
                            currentTable='T4'                          
                        />
    
                        {/* Seat S2 */}
                        <SeatComponent 
                            seat={seat}
                            seatId={{ seatOption: 't5s2', name: 'S2', setSeat }}
                            tableSeatOptions={tableSeatOptions}//available options for parent table
                            positionClasses="left-[calc(50%-8px-42px)] top-[35px] rotate-90"
                            textAlignment='!-rotate-90'
                            seatBarPosition="right-[5px] -top-[25px] rotate-90" 
                            currentTable='T4'                          
                        />
    
                        {/* Seat S3 */}
                        <SeatComponent 
                            seat={seat}
                            seatId={{ seatOption: 't5s3', name: 'S3', setSeat }}
                            tableSeatOptions={tableSeatOptions}//available options for parent table
                            positionClasses="-left-[calc(50%-8px-0px)] top-[34px] rotate-90"
                            textAlignment='!-rotate-90'
                            seatBarPosition="left-[6px] -top-[24px] rotate-90" 
                            currentTable='T4'                          
                        />
    
                        {/* Seat S4 */}
                        <SeatComponent 
                            seat={seat}
                            seatId={{ seatOption: 't5s4', name: 'S4', setSeat }}
                            tableSeatOptions={tableSeatOptions}//available options for parent table
                            positionClasses="left-[calc(50%-8px-105px)] top-[150px] rotate-90"
                            textAlignment='!-rotate-90'
                            seatBarPosition="left-[8px] top-[2px] rotate-90" 
                            currentTable='T4'                          
                        />
    
                        {/* Seat S5 */}
                        <SeatComponent 
                            seat={seat}
                            seatId={{ seatOption: 't5s5', name: 'S5', setSeat }}
                            tableSeatOptions={tableSeatOptions}//available options for parent table
                            positionClasses="left-[calc(50%-8px-42px)] top-[150px] rotate-90"
                            textAlignment='!-rotate-90'
                            seatBarPosition="right-[5px] top-[1px] rotate-90" 
                            currentTable='T4'                          
                        />
    
                        {/* Seat S6 */}
                        <SeatComponent 
                            seat={seat}
                            seatId={{ seatOption: 't5s6', name: 'S6', setSeat }}
                            tableSeatOptions={tableSeatOptions}//available options for parent table
                            positionClasses="-left-[calc(50%-8px-0px)] top-[150px] rotate-90"
                            textAlignment='!-rotate-90'
                            seatBarPosition="left-[7px] top-[1px] rotate-90" 
                            currentTable='T4'                          
                        />
    
                    </div>
                </div>
                {/* sixth table and seats */}
                <div className="w-1/2 h-full flex justify-center items-center">
    
                    {/* sixth table and seats */}
                    <div className="w-1/2 h-full flex justify-center items-center">
    
                        <div className='relative top-[40%] -right-[135%] rotate-90'>
                            {/* Table T5 */}
                            <TableComponent 
                                id='T5' 
                                label='T5' 
                                seatOptions={['t6s1', 't6s2', 't6s3']}//list of seats for each table
                                table={table}
                                setTable={setTable}//sets selected table
                                setTableSeatOptions={setTableSeatOptions}//sets table seat options
                                setSeat={setSeat}
                                size='w-[59px] h-[114px] rounded-[10px]' 
                                position='left-[calc(50%-25.5px-40px)] top-[35px]' 
                                tableRotation='-rotate-90'
                                textRotation='!rotate-0'
                            />
    
                            {/* Seat S1 */}
                            <SeatComponent 
                                seat={seat}
                                seatId={{ seatOption: 't6s1', name: 'S1', setSeat }}
                                tableSeatOptions={tableSeatOptions}//available options for parent table
                                positionClasses="left-[calc(50%-8px-75px)] top-[30px] rotate-90"
                                textAlignment='!-rotate-90'
                                seatBarPosition="left-[4px] -top-[25px] rotate-90" 
                                currentTable='T5'                          
                            />
    
                            {/* Seat S2 */}
                            <SeatComponent 
                                seat={seat}
                                seatId={{ seatOption: 't6s2', name: 'S2', setSeat }}
                                tableSeatOptions={tableSeatOptions}//available options for parent table
                                positionClasses="right-[calc(50%-8px-4px)] top-[30px] rotate-90"
                                textAlignment='!-rotate-90'
                                seatBarPosition="right-[4px] -top-[25px] rotate-90" 
                                currentTable='T5'                          
                            />
    
                            {/* Seat S3 */}

                            <SeatComponent 
                                seat={seat}
                                seatId={{ seatOption: 't6s3', name: 'S3', setSeat }}
                                tableSeatOptions={tableSeatOptions}//available options for parent table
                                positionClasses="left-[calc(50%-8px-110px)] top-[75px] rotate-0"
                                textAlignment='!-rotate-90'
                                seatBarPosition="right-[4px] -top-[23px] rotate-90" 
                                currentTable='T5'                          
                            />
    
                        </div>
    
                    </div>
                    
                </div>
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

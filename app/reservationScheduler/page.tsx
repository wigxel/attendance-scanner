'use client'

import { ChevronLeft } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { DateRange } from 'react-day-picker'
import "react-day-picker/dist/style.css";
import { useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';
import SchedulerComponent from '@/components/scheduler';
import SeatReservationComponent from '@/components/seatReservation';



export default function ReservationScheduler() {

    const { isAuthenticated } = useConvexAuth();
    const router = useRouter();

    const [selected, setSelected] = useState<DateRange | undefined>();
    const [timeValue, setTimeValue] = useState('') // custom time state
    const [numberOfSeats, setNumberOfSeats] = useState<number>(1);
    const [step, setStep] = useState<string>('scheduler'); // step in the reservation process
    const [isNav, setIsNav] = useState<boolean>(false) // for navigation bar
    const [table, setTable] = useState<string>('')
    const [seat, setSeat] = useState<string[]>([])
   

    
    // useEffect(() => {
    //     // If user is not authenticated, redirect to sign-in page
    //     if (!isAuthenticated) {
    //     router.push("/userLogin");
    //     }
    // }, [isAuthenticated, router])

    console.log(selected, timeValue, numberOfSeats, step, isNav, seat, table)

  return (
    <section className="w-full h-screen flex justify-center items-center p-4 xl:p-0">
        <div className="w-full sm:w-[335px] h-[812px] flex flex-col justify-start items-center">
   
           <nav className={(isNav === true) ? 'w-full h-[99px] absolute top-0 flex items-center bg-(--navigation-gray) px-2.5 pt-12' : 'hidden'}>
   
                <button 
                    type='button' 
                    className='cursor-pointer flex items-center rounded-md hover:bg-gray-300'
                    onClick={() => setStep(step)}
                >
                   <span className='w-8 h-8 text-left flex justify-center items-center'><ChevronLeft /></span>
               </button>
               
               <div className='xl:w-full ml-20 xl:ml-0'>
                   <h3 className='text-sm text-center font-semibold'>Reserve a seat</h3>
               </div>
           </nav>
   
           <form className=''>
                {
                    // rendering the scheduler component if the step is 'scheduler'
                    step === 'scheduler' && 
                    <SchedulerComponent 
                        setIsNav={setIsNav} 
                        setStep={setStep} 
                        selected={selected}
                        numberOfSeats={numberOfSeats}
                        setSelected={setSelected} 
                        timeValue={timeValue}
                        setTimeValue={setTimeValue} 
                        setNumberOfSeats={setNumberOfSeats}
                    />
                }

                {
                    // rendering the scheduler component if the step is 'scheduler'
                    step === 'seatReservation' && 
                    <SeatReservationComponent 
                        setIsNav={setIsNav} 
                        setStep={setStep} 
                        table={table}
                        setTable={setTable}
                        seat={seat}
                        setSeat={setSeat}
                    />
                }
           </form>
           
         </div>
    </section>
  )
}


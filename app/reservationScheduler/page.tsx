'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { DateRange } from 'react-day-picker'
import "react-day-picker/dist/style.css";
import { useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';
import SchedulerComponent from '@/components/scheduler';
import SeatReservationComponent from '@/components/seatReservation';
import ReservationSummaryComponent from '@/components/reservationSummary';
import PaymentOptionComponent from '@/components/paymentOption';
import SeatReservationSuccessComponent from '@/components/seatReservationSuccess';
import ReservationTicketComponent from '@/components/reservationTicket';



export default function ReservationScheduler() {

    const { isAuthenticated } = useConvexAuth();
    const router = useRouter();

    const [selected, setSelected] = useState<DateRange | undefined>();
    const [timeValue, setTimeValue] = useState('') // custom time state
    const [numberOfSeats, setNumberOfSeats] = useState<number>(1);
    const [step, setStep] = useState<string>('scheduler'); // step in the reservation process
    const [isNav, setIsNav] = useState<boolean>(false) // for navigation bar
    const [table, setTable] = useState<string[]>([])//table selection
    const [seat, setSeat] = useState<string[]>([])//seat selection
   
    // const { watch} = useForm();
    
    // useEffect(() => {
    //     // If user is not authenticated, redirect to sign-in page
    //     if (!isAuthenticated) {
    //     router.push("/userLogin");
    //     }
    // }, [isAuthenticated, router])

  return (
    <section className="w-full h-screen flex justify-center items-center p-4 xl:p-0 relative">
        <div className="w-full sm:w-[335px] h-[812px] flex flex-col justify-start items-center">
   
           <form className=''>
                {
                    // rendering the scheduler component if the step is 'scheduler'
                    step === 'scheduler' && 
                    <SchedulerComponent 
                        setStep={setStep}//sets the component to render
                        selected={selected}
                        numberOfSeats={numberOfSeats}
                        setSelected={setSelected} 
                        timeValue={timeValue}
                        setTimeValue={setTimeValue} 
                        setNumberOfSeats={setNumberOfSeats}
                    />
                }

                {
                    // rendering the seat reservation component if the step is 'seat_reservation'
                    step === 'seatReservation' && 
                    <SeatReservationComponent 
                        setStep={setStep} //sets the component to render
                        table={table}
                        setTable={setTable}
                        seat={seat}
                        setSeat={setSeat}
                    />
                }
           </form>
           { 
                step === 'reservationSummary' && 
                <ReservationSummaryComponent 
                    setStep={setStep} 
                    selected={selected}
                    timeValue={timeValue}
                    numberOfSeats={numberOfSeats}
                    table={table}
                    seat={seat}
                />
            }
            {
                step === 'paymentOptions' && 
                <PaymentOptionComponent
                    setStep={setStep} //sets the component to render
                />
            }
            {
                step === 'reservationSuccess' && 
                <SeatReservationSuccessComponent
                    setStep={setStep} //sets the component to render
                />
            }
            {
                step === 'e-ticket' && 
                <ReservationTicketComponent
                    selected={selected}
                    timeValue={timeValue}
                    numberOfSeats={numberOfSeats}
                    table={table}
                    seat={seat}
                />
            }
         </div>
    </section>
  )
}


'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { DateRange } from 'react-day-picker'
import "react-day-picker/dist/style.css";
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useRouter } from 'next/navigation';
import SchedulerComponent from '@/components/scheduler';
import SeatReservationComponent from '@/components/seatReservation';
import ReservationSummaryComponent from '@/components/reservationSummary';
import PaymentOptionComponent from '@/components/paymentOption';
import SeatReservationSuccessComponent from '@/components/seatReservationSuccess';
import ReservationTicketComponent from '@/components/reservationTicket';
import { SeatObject } from '@/components/seat';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import ToastComponentProps from '@/components/toast'
import { SeatStatus } from '@/convex/seatReservation';

interface MappedTable {
    selectedTable: string;
    seatReserved: SeatObject[];
}

export default function ReservationScheduler() {

    const { isAuthenticated } = useConvexAuth();
    const router = useRouter();

    const [selectedDate, setSelectedDate] = useState<DateRange | undefined>(undefined);
    const [duration, setDuration] = useState('') // custom time state
    const [numberOfSeats, setNumberOfSeats] = useState<number>(1);
    const [step, setStep] = useState<string>('scheduler'); // step in the reservation process
    const [table, setTable] = useState<string[]>([])//table selection
    const [seat, setSeat] = useState<SeatObject[]>([])//seat selection
    const [userId, setUserId] = useState<Id<'users'> | null>(null)
    //insert reservation mutation 
    const createReservation = useMutation(api.reservation.createReservation);
    //insert reservation mutation 
    const createSeatReservation = useMutation(api.seatReservation.createSeatReservation);

    //queries
    //fetch all user for testing as we have just one user in the db. 
    // However it should fetch the details of the Authenticated user.
    const user = useQuery(api.users.getAllUsers)
   
    // const { watch} = useForm();
    
    // useEffect(() => {
    //     // If user is not authenticated, redirect to sign-in page
    //     if (!isAuthenticated) {
    //     router.push("/userLogin");
    //     }
    // }, [isAuthenticated, router])
    const seatToTable = (seatOption: string) => {
        // Exact match for Hub manager
        if (seatOption === 'Hub Manager') return 'Hub Manager';

        // Match 't1s1' → 'T1', 't2s3' → 'T2', etc.
        const match = seatOption.match(/^t(\d+)/i);
        return match ? `T${match[1]}` : null;
    };

    /* -------------------------------------------------
    rebuild table into to take the shape T1 - S1, T3 - S1, S2, S3, T4 - S2
    ------------------------------------------------- */

    const mappedTable: MappedTable[] = table.reduce<MappedTable[]>((acc: MappedTable[], selectedTable: string) => {
        // all seats that belong to this table
        const reserved: SeatObject[] = seat.filter(
            (s: SeatObject) => seatToTable(s.seatAllocation) === selectedTable
        );

        if (reserved.length) {
            acc.push({ selectedTable, seatReserved: reserved });
        }
        return acc;
    }, []);

    const handleCreateSeatReservation = async () => {
        try{
            return await createSeatReservation(
                { 
                    mappedTable: mappedTable.map(({ selectedTable, seatReserved }) => ({
                       selectedTable,
                       seatReserved: seatReserved.map(seat => ({
                           label: seat.label,
                           seatAllocation: seat.seatAllocation,
                           seatStatus: seat.seatStatus as SeatStatus
                       }))
                   })),
                   selectedDate: selectedDate ? `${selectedDate.from?.toISOString() || ''}${selectedDate.to ? ' - ' + selectedDate.to.toISOString() : ''}` : '',
                }
            );

            // reset form (optional)

        } catch (err) {
            console.error(err);
            ToastComponentProps({ type: 'error', message: 'Failed to create reservation' })
        }
    }
    
    const handleCreateReservation = async () => {

        const seatReservationsId = await handleCreateSeatReservation();

        try{
            if (!userId) {
                ToastComponentProps({ type: 'error', message: 'User not found' });
                return false;
            }
            if (!seatReservationsId) {
                ToastComponentProps({ type: 'error', message: 'Seat reservation not found' });
                return false;
            }
            
            return await createReservation(
                { 
                    userId, 
                    selectedDate: selectedDate ? `${selectedDate.from?.toISOString() || ''}${selectedDate.to ? ' - ' + selectedDate.to.toISOString() : ''}` : '',
                    duration, 
                    numberOfSeats, 
                    seatReservationsId,  
                    status: 'pending'
                }
            );
            // reset form (optional)
        } catch (err) {
            console.error(err);
            ToastComponentProps({ type: 'error', message: 'Failed to create reservation' })
        }
    }
    // useEffect to handle the step change and create seat reservation
    useEffect(() => {
        const createReservation = async () => {
            if (step === 'paymentOptions') {
                return await handleCreateReservation();
            }
        }

        createReservation();
    }, [step]);

    useEffect(() => {
        return setUserId(user && user[0]?._id ? user[0]._id as Id<'users'> : null);
    }, [user, userId])

    console.log(seat)

  return (
    <section className="w-full h-screen flex justify-center items-center p-4 xl:p-0 relative">
        <div className="w-full sm:w-[335px] h-[812px] flex flex-col justify-start items-center">
   
           <form className=''>
                {
                    // rendering the scheduler component if the step is 'scheduler'
                    step === 'scheduler' && 
                    <SchedulerComponent 
                        setStep={setStep}//sets the component to render
                        selectedDate={selectedDate}
                        numberOfSeats={numberOfSeats}
                        setSelectedDate={setSelectedDate} 
                        duration={duration}
                        setDuration={setDuration} 
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
                        numberOfSeats={numberOfSeats} 
                        cfg={{
                        id: '',
                        wrapper: '',
                        container: '',
                        table: {
                            size: '',
                            position: '',
                            tableRotation: '',
                            textRotation: ''
                        },
                        seats: []
                        }} 
                        TABLE_LAYOUT={[]}  
                        dbSeats={[]}   
                        selectedDate={selectedDate}          
                    />
                }
           </form>
           { 
                step === 'reservationSummary' && 
                <ReservationSummaryComponent 
                    setStep={setStep} 
                    selectedDate={selectedDate}
                    duration={duration}
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
                    selectedDate={selectedDate}
                    duration={duration}
                    numberOfSeats={numberOfSeats}
                    table={table}
                    seat={seat}
                />
            }
         </div>
    </section>
  )
}



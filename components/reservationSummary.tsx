'use client'

import React, { Dispatch, SetStateAction, useState } from 'react'
import ReservationNavigationComponent from './reservationNavigation';
import { DateRange } from 'react-day-picker';

type ReservationSummaryComponentProps = {
  setStep: Dispatch<SetStateAction<string>>
  selected: DateRange | undefined
  timeValue: string
  numberOfSeats: number
  table: string
  seat: string[]
};

export default function ReservationSummaryComponent(
    {
        setStep, selected, timeValue, 
        numberOfSeats, table, seat 
    }:
        ReservationSummaryComponentProps 
    ){


    const data = [
        {id: 1, field: 'Name', val: 'Sim Fubara'},
        {id: 2, field: 'Phone', val: '08041941941'},
        {id: 3, field: 'Email', val: 'simfubara@gmail.com'},
        {id: 4, field: 'Reservation ID', val: 'Sim Fubara'},
        {id: 5, field: 'Duration', val: timeValue},
        // {id: 6, field: 'Table No.', val: 'T2-S1, S2, S3'},
        {id: 6, field: 'Table No.', val: `${table}-${seat.filter((item) => item.startsWith('S'))}`},
        {id: 7, field: 'No. of Seats', val: numberOfSeats},
        {id: 8, field: 'Reservation Date', val: selected},
        {id: 9, field: 'Payment Status', val: 'Not Paid'},
        {id: 10, field: 'Amount', val: 'N3000.00'}
    ]

    const handlePayment = () =>{
        setStep('paymentOptions')
    }
  return (
      <div className="w-full sm:w-[335px] h-[812px] flex flex-col justify-center items-center">
        {/* navigation for component rendering */}
        <ReservationNavigationComponent step={'seatReservation'} setStep={setStep}/>
        
        {/* header text */}
        <header className='w-[335px] sm:max-w-[335px] mt-32 xl:mt-8'>
            <h3 className='w-full text-2xl font-normal text-left mb-10 mt-16'>Reservation Summary</h3>
        </header>

        {/* summary information */}
        <div className="w-[335px] sm:max-w-[335px] h-[389px] sm:max-h-[389px] flex flex-col justify-center items-center bg-(--background-gray) rounded-lg ">
            <div className='w-full h-full px-4 py-6'> 
                {
                    data.map((items, index) => (
                        <div key={index} className='w-full'>
                            <ul className='w-full list-none'>
                                <li className={(index === 2) ? 
                                    'w-full flex justify-between items-center border-b-2 border-dashed pb-6 mb-5' : 
                                    'w-full flex justify-between items-center py-2'
                                }>
                                    <span className='text-xs font-medium text-(--text-gray)'>{items.field}</span>
                                    <span className='text-xs font-semibold'>
                                        {typeof items.val === 'object' && items.val !== null
                                            ? `${items.val.from?.toLocaleDateString() || ''} - ${items.val.to?.toLocaleDateString() || ''}`
                                            : items.val !== undefined
                                                ? items.val.toString()
                                                : ''}
                                    </span>
                                </li>
                            </ul>
                        </div>
                    ))
                }
            </div>
            
        </div>
          
        <button 
            type="button" 
            className="w-full h-8 text-xs font-semibold bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm mt-[140px]"
            onClick={() => handlePayment()}
        >
            Pay with PayStack
        </button>
        
    </div>
    
  )
}

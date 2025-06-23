import { AlignLeft } from 'lucide-react'
import React, { Dispatch, SetStateAction, useState } from 'react'
import ReservationNavigationComponent from './reservationNavigation';

interface PaymentOptionComponentProps{
    setStep: Dispatch<SetStateAction<string>>
}
export default function PaymentOptionComponent(
    {
        setStep
    } : PaymentOptionComponentProps
) {

    const handleSubmit = () =>{
        setStep('reservationSuccess')
    }

  return (
      <div className="w-[335px] sm:w-[335px] h-[812px] flex flex-col justify-start items-center">
        {/* navigation */}
         <ReservationNavigationComponent step='reservationSummary' setStep={setStep}/>

        {/* header */}
        <header className='w-full mt-40 xl:mt-16'>
            <h3 className='text-2xl text-left'>Choose Payment Option</h3>
        </header>

        <div className='w-full mt-10'>
            <ul>
                <li 
                    className='w-full h-[70px] bg-(--background-gray) hover:bg-(--navigation-gray) cursor-pointer rounded-md p-5 flex justify-between items-center'
                    onClick={() => handleSubmit()}
                >
                    <h4 className='text-sm font-normal'>Pay with PayStack</h4>
                    <span className='w-8 h-8 flex justify-center items-center text-center bg-(--button-gray) rounded-sm'>
                        <AlignLeft className='w-7 h-7'/>
                    </span>
                </li>
            </ul>
        </div>
      </div>
  )
}

import { ChevronLeft } from 'lucide-react';
import React, { Dispatch, SetStateAction } from 'react'

interface ReservationNavigationComponentProps{
    step: string,
    setStep: Dispatch<SetStateAction<string>>
}
export default function ReservationNavigationComponent(
    {step, setStep}: ReservationNavigationComponentProps
) {
    
  return (
    <nav className={'w-full h-[99px] absolute top-0 flex items-center bg-(--navigation-gray) px-2.5 pt-12'}>
   
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
  )
}

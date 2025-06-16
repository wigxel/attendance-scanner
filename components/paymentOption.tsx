import { AlignLeft, ChevronLeft } from 'lucide-react'
import React from 'react'
import SeatReservationSuccessComponent from './seatReservationSuccess';

export default function PaymentOptionComponent() {

    const [isPaymentOption, setIsPaymentOption] = React.useState(false);

  return (
    (isPaymentOption === false) ?
      <div className="w-[335px] sm:w-[335px] h-[812px] flex flex-col justify-start items-center">
        {/* navigation */}
        <nav className='w-full h-[99px] absolute top-0 flex items-center bg-(--navigation-gray) px-2.5 pt-12'>
        
            <a href='/reservationScheduler'className='cursor-pointer rounded-md hover:bg-gray-300'>
                <span className='w-8 h-8 text-left flex justify-center items-center'><ChevronLeft /></span>
            </a>
            
            <div className='xl:w-full ml-20 xl:ml-0'>
                <h3 className='text-sm text-center font-semibold'>Reserve a seat</h3>
            </div>

        </nav>

        {/* header */}
        <header className='w-full mt-40 xl:mt-16'>
            <h3 className='text-2xl text-left'>Choose Payment Option</h3>
        </header>

        <div className='w-full mt-10'>
            <ul>
                <li 
                    className='w-full h-[70px] bg-(--background-gray) hover:bg-(--navigation-gray) cursor-pointer rounded-md p-5 flex justify-between items-center'
                    onClick={() => setIsPaymentOption(true)}
                >
                    <h4 className='text-sm font-normal'>Pay with PayStack</h4>
                    <span className='w-8 h-8 flex justify-center items-center text-center bg-(--button-gray) rounded-sm'>
                        <AlignLeft className='w-7 h-7'/>
                    </span>
                </li>
            </ul>
        </div>
      </div>
    : 
      <SeatReservationSuccessComponent/>
  )
}

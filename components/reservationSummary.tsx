'use client'

import { ChevronLeft } from 'lucide-react'
import React from 'react'
import PaymentOptionComponent from './paymentOption';

type ReservationTicketComponentProps = {
  setIsConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
  isConfirmed: boolean;
};

const ReservationSummaryComponent: React.FC<ReservationTicketComponentProps> = ({setIsConfirmed, isConfirmed}) => {

    const [isPaymentOption, setIsPaymentOption] = React.useState(false);

    const data = [
        {id: 1, field: 'Name', val: 'Sim Fubara'},
        {id: 2, field: 'Phone', val: '08041941941'},
        {id: 3, field: 'Email', val: 'simfubara@gmail.com'},
        {id: 4, field: 'Reservation ID', val: 'Sim Fubara'},
        {id: 5, field: 'Duration', val: '1hr'},
        {id: 6, field: 'Table No.', val: 'T2-S1, S2, S3'},
        {id: 7, field: 'No. of Seats', val: '3'},
        {id: 8, field: 'Reservation Date', val: '22nd May, 2025'},
        {id: 9, field: 'Payment Status', val: 'Not Paid'},
        {id: 10, field: 'Amount', val: 'N3000.00'}
    ]
  return (
    (isPaymentOption === false) ? 
      <div className={(isConfirmed === false) ? "hidden" : "w-full sm:w-[335px] h-[812px] flex flex-col justify-center items-center"}>

        <nav className='w-full h-[99px] absolute top-0 flex items-center bg-(--navigation-gray) px-2.5 pt-12'>

            <button type='button' onClick={() => setIsConfirmed(false)} className='w-8 h-8 flex justify-center items-center rounded-md hover:bg-gray-300'>
                <span className='w-8 h-8 flex justify-center items-center'><ChevronLeft /></span>
            </button>
            
            <div className='xl:w-full ml-20 xl:ml-0'>
                <h3 className='text-sm text-center font-semibold'>Reserve a seat</h3>
            </div>
        </nav>
        
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
                                    <span className='text-xs font-semibold'>{items.val}</span>
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
            onClick={() => setIsPaymentOption(true)}
        >
            Pay with PayStack
        </button>
        
    </div> : 
    <PaymentOptionComponent/>
  )
}

export default ReservationSummaryComponent
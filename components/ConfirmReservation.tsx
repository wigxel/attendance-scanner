import React from 'react'
import { CreditCard, Landmark } from "lucide-react";
import { useForm } from 'react-hook-form';
import { set } from 'date-fns';

  interface FormData {
    cardNumber: string
    expiryDate: string
    cvv: string
  }

  
interface ConfirmReservationProps {
    selected: Date | undefined;
    firstName?: string;
    lastName?: string;
    email?: string;
    seats?: string;
    total?: number;
    setIsConfirmed?: (isConfirmed: boolean) => void;
}

export default function ConfirmReservation({ selected, firstName, lastName, email, seats, total, setIsConfirmed }: ConfirmReservationProps) {

 const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();
 const [paymentMode, setPaymentMode] = React.useState<string>("card");

  const paymentHandler = (data: FormData) => {
    console.log(data+' payment handler')
  }

  return (
    <div className="w-[400px] h-fit bg-white border rounded-lg p-4 flex flex-col gap-4">
        

        {/* order summary */}
        <div className="w-full h-fit">
          <h1 className="text-2xl font-bold">Order summary</h1>

          <div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Name</p>
              <p className="text-sm text-gray-500">{`${lastName} ${firstName}`}</p>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-sm text-gray-500">{email}</p>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Reservation Date</p>
              <p className="text-sm text-gray-500">{selected ? selected.toLocaleDateString() : "-"}</p>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Seats</p>
              <p className="text-sm text-gray-500">{seats}</p>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500 font-semibold">Total</p>
              <p className="text-sm text-gray-500 font-semibold">{`$${total}`}</p>
            </div>

          </div>
        </div>

        <div className='w-full h-fit border-t py-2'>
          <h1 className="text-2xl font-bold">Payment</h1>
          <p className="text-sm text-gray-500">Please enter your payment details to confirm your reservation.</p>

          <div className="w-full h-fit py-4 flex justify-start items-center">
            
            {/* card payment button */}
            <button 
                type="button" 
                className={(paymentMode === 'card') ? 
                    "w-26 h-16 border-2 border-gray-600 bg-gray-200 hover:bg-gray-300 rounded-md flex flex-col justify-center items-center mr-2" : 
                    "w-26 h-16 bg-gray-200 hover:bg-gray-300 rounded-md flex flex-col justify-center items-center mr-2"}
                onClick={() => setPaymentMode("card")}
            >
              <i className="text-3xl"><CreditCard /></i>
              <span className="text-base">Card</span>
            </button>

              {/* transfer button */}
             <button 
                type="button" 
                className={(paymentMode === 'transfer') ? 
                    "w-26 h-16 border-2 border-gray-600 bg-gray-200 hover:bg-gray-300 rounded-md flex flex-col justify-center items-center mr-2" : 
                    "w-26 h-16 bg-gray-200 hover:bg-gray-300 rounded-md flex flex-col justify-center items-center mr-2"}
                onClick={() => setPaymentMode("transfer")}
            >
              <i className="text-3xl"><Landmark /></i>
              <span className="text-base">Transfer</span>
            </button>

          </div>

          {/* payment form for card payment*/}
          <form onSubmit={handleSubmit(paymentHandler)} className={(paymentMode === 'card') ? "inline-block mt-4" : "hidden"}>
            <input placeholder="Card Number" className="w-full h-12 border p-2 mb-4 rounded-md " {...register("cardNumber", { required: true })}/>
            {errors.cardNumber && <span className="text-red-500">This field is required</span>}

            <input placeholder="Expiry Date" className="w-full h-12 border p-2 mb-4 rounded-md " {...register("expiryDate", { required: true })}/>
            {errors.expiryDate && <span className="text-red-500">This field is required</span>}

            <input placeholder="CVV" className="w-full h-12 border p-2 mb-4 rounded-md " {...register("cvv", { required: true })}/>
            {errors.cvv && <span className="text-red-500">This field is required</span>}

            <button type="submit" className="w-full h-10 bg-gray-800 text-white hover:bg-gray-600">Pay Now</button>
          </form>


            {/* payment form for transfer payment*/}
            <div className={(paymentMode === 'transfer') ? "inline-block mt-4" : "hidden"}>
                <p className="text-sm text-gray-500">Please transfer the total amount to the following bank account:</p>
                <p className="text-sm text-gray-500 font-semibold">Bank Name: XYZ Bank</p>
                <p className="text-sm text-gray-500 font-semibold">Account Number: 123456789</p>
                <p className="text-sm text-gray-500 font-semibold">IFSC Code: XYZ1234</p>
                <p className="text-sm text-gray-500">After transferring, please click the button below to confirm your reservation.</p>
                <button type="button" className="w-full h-10 bg-gray-800 text-white hover:bg-gray-600 mt-4">Confirm Transfer</button>
            </div>
        </div>
        
        <div className='bg-red-300'>
            <button 
                type="button" 
                className="w-full h-10 bg-gray-200 text-black hover:bg-gray-300"
                onClick={() => setIsConfirmed && setIsConfirmed(false)}
            >
                Cancel
            </button>
        </div>
      </div>
  )
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useReadProfile } from "@/hooks/auth";

import { DayPicker } from "react-day-picker";
import 'react-day-picker/dist/style.css';
import { useForm } from "react-hook-form";
import { CreditCard, Landmark } from "lucide-react";

export default function Onboarding() {
    const router = useRouter();
    const profile = useReadProfile();
    const [selected, setSelected] = useState<Date>();
    const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();

  useEffect(() => {
    if (!profile) return;
    // If user already has a profile, redirect to home
    if (profile?.firstName) {
      router.push("/");
    }
  }, [profile, router]);

  interface FormData {
    firstname: string;
    lastname: string;
    seats: string
    email: string
  }


  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <section className="flex flex-col xl:flex-row gap-8 w-[800px] mx-auto h-screen justify-center items-center ">

      {/* reservation */}
      <div className="w-[400px] h-fit bg-white border rounded-lg p-4 flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Book your reservation</h1>
          <DayPicker
              // animate
              mode="single"
              selected={selected}
              onSelect={setSelected}
              footer={
                selected ? `Selected: ${selected.toLocaleDateString()}` : "Pick a day."
              }
          />

          
      <form onSubmit={handleSubmit(onSubmit)} className="my-4">

          <input defaultValue="First Name" {...register("firstname", { required: true })}  className="w-full h-12 border p-2 mb-4 rounded-md "/>
          {errors.firstname && <span>This field is required</span>}

          <input defaultValue="Last Name" {...register("lastname", { required: true })} className="w-full h-12 border p-2 mb-4 rounded-md " />
          {errors.lastname && <span>This field is required</span>}

          <input defaultValue="Email" {...register("email", { required: true })} className="w-full h-12 border p-2 mb-4 rounded-md " />
          {errors.email && <span>This field is required</span>}
          
          <select {...register("seats")} className=" w-full h-12 border p-2 mb-4 rounded-md " id="seats">
            <option disabled selected>Seats</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
          {errors.seats && <span>This field is required</span>}
          
          <button type="submit" className="w-full h-10 bg-gray-800 text-white hover:bg-gray-600">Confirm Booking</button>

      </form>

      </div>

      {/* payment section*/}
      <div className="w-[400px] h-fit bg-white border rounded-lg p-4 flex flex-col gap-4">
        

        {/* order summary */}
        <div className="w-full h-fit">
          <h1 className="text-2xl font-bold">Order summary</h1>

          <div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Reservation</p>
              <p className="text-sm text-gray-500">1</p>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Seats</p>
              <p className="text-sm text-gray-500">1</p>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-sm text-gray-500">$100</p>
            </div>
          </div>
        </div>

        <div className='w-full h-fit'>
          <h1 className="text-2xl font-bold">Payment</h1>
          <p className="text-sm text-gray-500">Please enter your payment details to confirm your reservation.</p>

          <div className="w-full h-fit py-4 flex justify-start items-center">
            
            {/* card payment button */}
            <button type="button" className="w-26 h-16 bg-gray-200  hover:bg-gray-300 rounded-md flex flex-col justify-center items-center mr-2">
              <i className="text-3xl"><CreditCard /></i>
              <span className="text-base">Card</span>
            </button>

              {/* transfer button */}
             <button type="button" className="w-26 h-16 bg-gray-200 hover:bg-gray-300 rounded-md flex flex-col justify-center items-center mr-2">
              <i className="text-3xl"><Landmark /></i>
              <span className="text-base">Transfer</span>
            </button>

          </div>

          {/* payment form */}
          <form className="my-4">
            <input defaultValue="Card Number" className="w-full h-12 border p-2 mb-4 rounded-md "/>
            <input defaultValue="Expiry Date" className="w-full h-12 border p-2 mb-4 rounded-md " />
            <input defaultValue="CVV" className="w-full h-12 border p-2 mb-4 rounded-md " />
            <button type="submit" className="w-full h-10 bg-gray-800 text-white hover:bg-gray-600">Pay Now</button>
          </form>

        </div>
        
      </div>

    </section>
  );
}

"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useReadProfile } from "@/hooks/auth";

import { DayPicker } from "react-day-picker";
import 'react-day-picker/dist/style.css';
import { useForm } from "react-hook-form";
import ConfirmReservation from "@/components/ConfirmReservation";


export default function Reservation() {
    const router = useRouter();
    const profile = useReadProfile();

    const [selected, setSelected] = useState<Date>();
    const [isConfirmed, setIsConfirmed] = useState<boolean>(false)
    const [firstName, setFirstName] = useState<string>();
    const [lastName, setLastName] = useState<string>();
    const [email, setEmail] = useState<string>();
    const [seats, setSeats] = useState<string>();
    const [total, setTotal] = useState<number>(100); // Assuming a fixed total for simplicity

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

  // Handler for confirming the booking
  // This function will be called when the form is submitted and the user clicks "Confirm Booking"
  // It will log the form data and the selected date, and set the isConfirmed state to true
  const confirmBookingHandler = (data: FormData) => {

    setFirstName(data.firstname);
    setLastName(data.lastname);
    setEmail(data.email);
    setSeats(data.seats);
    calculateTotal(data.seats);
    // If a date is selected, set isConfirmed to true
    if(selected !== undefined) return setIsConfirmed(true);
  };

  // function to calculate seat reservation cost
  const calculateTotal = (seats: string) => {
    const seatCount = parseInt(seats, 10);
    const seatTotal = seatCount * 100; // Assuming each seat costs $100
    setTotal(seatTotal);
  };
  
  return (
    <section className="w-full lg:w-fit h-screen  flex flex-col xl:flex-row gap-8 mx-auto justify-center items-center p-4 xl:p-0">

      {/* reservation */}
      <div 
        className={(isConfirmed === false ) ? 
          "w-[400px] h-fit bg-white border rounded-lg p-4 flex flex-col gap-4" :
          'hidden'
          }
        >
          <h1 className="text-2xl font-bold">Book your seat reservation</h1>
          <DayPicker
              // animate
              mode="single"
              selected={selected}
              onSelect={setSelected}
              footer={
                selected ? `Selected: ${selected.toLocaleDateString()}` : "Pick a day."
              }
          />

          
      <form onSubmit={handleSubmit(confirmBookingHandler)} className="my-4">

          <input placeholder="First Name" {...register("firstname", { required: true })}  className="w-full h-12 border p-2 mb-4 rounded-md "/>
          {errors.firstname && <span className="text-red-500">This field is required</span>}

          <input placeholder="Last Name" {...register("lastname", { required: true })} className="w-full h-12 border p-2 mb-4 rounded-md " />
          {errors.lastname && <span className="text-red-500">This field is required</span>}

          <input placeholder="Email" {...register("email", { required: true })} className="w-full h-12 border p-2 mb-4 rounded-md " />
          {errors.email && <span className="text-red-500">This field is required</span>}
          
          <select {...register("seats", {required: true})} className=" w-full h-12 border p-2 mb-4 rounded-md " id="seats">
            <option disabled >Seats</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
          {errors.seats && <span className="text-red-500">This field is required</span>}
          
          <button type="submit" className="w-full h-10 bg-gray-800 text-white hover:bg-gray-600">Confirm Booking</button>

      </form>

      </div>

      {/* payment section*/}
      {
        (isConfirmed === true ) ? 
        <ConfirmReservation 
          selected={selected}
          firstName={firstName}
          lastName={lastName}
          email={email}
          seats={seats}
          total={total}
          setIsConfirmed={setIsConfirmed}
        /> : 
        false}

    </section>
  );
}

"use client";

import {  useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReadProfile } from "@/hooks/auth";
import 'react-day-picker/dist/style.css';
import { useForm } from "react-hook-form";
import DateReservationComponent from "@/components/dateReservationComponent";
import WelcomebackComponent from "@/components/welcomebackComponent";
import LoginLandingPageComponent from "@/components/loginLandingComponent";
import LoginOptionsComponent from "@/components/loginOptionsComponent";
import TransactionSuccessComponent from "@/components/transactionSuccessComponent";
import SummaryComponent from "@/components/summaryComponent";


export default function Reservation() {
    const router = useRouter();
    const profile = useReadProfile();


    const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();

  useEffect(() => {
    if (!profile) return;
    // If user already has a profile, redirect to home
    if (profile?.firstName) {
      router.push("/");
    }
  }, [profile, router]);

  interface FormData {
    email: string;
    password: string;
    seats: string
  }

  const onSubmit = () =>{

  }
  
  return (
    <section className="w-full h-screen flex justify-center items-center relative px-5 xl:p-0">

      {/* reservation
      <div className="w-full sm:w-[335px] h-[812px] flex flex-col justify-center items-center">
        <header className="flex flex-col justify-center items-center">
          <h3 className="text-xl">Welcome to</h3>
          <h1 className="text-5xl font-bold my-2">INSPACE</h1>
          <span className="my-4">Please log in to get started</span>
        </header>
          
      <form onSubmit={handleSubmit(onSubmit)} className="my-4">

          <input 
            placeholder="Enter your email" 
            {...register("email", { required: true })}  
            className="w-full sm:max-w[335px] h-8 text-xs border p-2 mb-4 rounded-sm "
          />

          {errors.email && <span className="text-red-500 text-xs">This field is required</span>}

          <input 
            placeholder="Enter your password" 
            {...register("password", { required: true })} 
            className="w-full sm:max-w[335px] h-8 text-xs border p-2 mb-4 rounded-sm " 
          />

          {errors.password && <span className="text-red-500 text-xs">This field is required</span>}
          
          <button type="submit" className="w-full h-8 text-xs font-semibold bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm">Log In</button>

      </form>

      <div>
        <span className='text-sm font-normal'>Don&apos;t have an account? </span>
        <a href="#" className="text-sm font-normal ml-2 underline hover:text-blue-500 cursor-pointer">Register Instead</a>
      </div>

      </div> */}

      {/* <WelcomebackComponent/> */}
      <DateReservationComponent/>
      {/* <LoginLandingPageComponent/> */}
      {/* <LoginOptionsComponent/> */}
      {/* <TransactionSuccessComponent/> */}
      {/* <SummaryComponent/> */}

    </section>
  );
}

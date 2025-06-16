"use client";

import {  useEffect } from "react";
import { useRouter } from "next/navigation";
import 'react-day-picker/dist/style.css';
import { useForm } from "react-hook-form";
import { useConvexAuth } from "convex/react";


export default function Reservation() {
    const { isAuthenticated } = useConvexAuth();
    const router = useRouter();

    const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();

    useEffect(() => {
      // If user is not authenticated, redirect to sign-in page
      if (!isAuthenticated) {
        router.push("/userLogin");
      }
    }, [isAuthenticated, router])

  const onSubmit = () =>{

  }
  
  return (
    <section className="w-full h-screen flex justify-center items-center p-4 xl:p-0">

      {/* login options */}
      <div className="w-full sm:w-[335px] h-[812px] flex flex-col gap-8 justify-center items-center">
        {/* header text */}
          <header className="flex flex-col justify-center items-center">
            <h3 className="text-xl">Welcome to</h3>
            <h1 className="text-5xl font-bold my-2">INSPACE</h1>
          </header>

        {/* login options */}
        <div className="w-full h-fit  flex  flex-col mt-32">
          {/* guest button */}
          <a href="/guest" className="w-full h-8 text-xs font-semibold border-2 flex justify-center items-center border-(--button-gray) bg-white text-black hover:bg-(--button-gray) rounded-sm mb-4">Continue as a Guest</a>
          {/* user button */}
          <a href="/userLogin" className="w-full h-8 text-xs font-semibold flex justify-center items-center  bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm">Continue as a User</a>
        </div>

      </div>
    </section>

     

  );
}
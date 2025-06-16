'use client'

import { Calendar, ChevronDown, ChevronLeft, ChevronUp, Clock, Minus, Plus, UsersRound } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import {DateRange, DayPicker} from 'react-day-picker'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import "react-day-picker/dist/style.css";
import { useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';

interface FormData {
    reserved: boolean,
    available: boolean,
    selected: boolean
    time: string;
    customTime: string
}

export default function ReservationScheduler() {

    const { isAuthenticated } = useConvexAuth();
    const router = useRouter();

    const [selected, setSelected] = useState<DateRange | undefined>(); // user date selection
    const [isOpen, setIsOpen] = useState(false); // dropdown state
    const [isCustom, setIsCustom] = useState(false);
    const [timeValue, setTimeValue] = useState() // custom time state
    const [customTime, setCustomTime] = useState(''); // dropdown for custom time state option
    const [numberOfSeats, setNumberOfSeats] = useState<number>(0); // default number of seats

    const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();

    const timeData = [
        {label: '8:00 - 9:00', value: '8:00 - 9:00'},
        {label: '9:00 - 10:00', value: '9:00 - 10:00'},
        {label: '10:00 - 11:00', value: '10:00 - 11:00'},
        {label: '11:00 - 12:00', value: '11:00 - 12:00'},
        {label: '12:00 - 13:00', value: '12:00 - 13:00'},
        {label: '13:00 - 14:00', value: '13:00 - 14:00'},
        {label: '14:00 - 15:00', value: '14:00 - 15:00'},
        {label: '15:00 - 16:00', value: '15:00 - 16:00'},
        {label: '16:00 - 17:00', value: '16:00 - 17:00'},
    ]
    
    useEffect(() => {
        // If user is not authenticated, redirect to sign-in page
        if (!isAuthenticated) {
        router.push("/userLogin");
        }
    }, [isAuthenticated, router])

  return (
    <section className="w-full h-screen flex justify-center items-center p-4 xl:p-0">
        <div className="w-full sm:w-[335px] h-[812px] flex flex-col justify-start items-center">
   
           <nav className='w-full h-[99px] absolute top-0 flex items-center bg-(--navigation-gray) px-2.5 pt-12'>
   
               <a href='/welcomeOptions' className='cursor-pointer flex items-center rounded-md hover:bg-gray-300'>
                   <span className='w-8 h-8 text-left flex justify-center items-center'><ChevronLeft /></span>
               </a>
               
               <div className='xl:w-full ml-20 xl:ml-0'>
                   <h3 className='text-sm text-center font-semibold'>Reserve a seat</h3>
               </div>
           </nav>
   
           <form className='mt-38 xl:mt-18'>
               {/* header text */}
               <div 
                   className='w-[335px] sm:max-w-[335px] h-[330px] sm:max-h-[330px] p-4 flex flex-col bg-(--background-gray) rounded-lg'
               >
                   <div className='flex items-center justify-between'>
   
                       <span className='text-(--text-gray) text-xs font-medium flex items-center'>
                           <Calendar className='w-4 h-4 mr-0.5' />
                           Choose Date
                       </span>
   
                       <div className='flex justify-evenly items-center'>
                           <label htmlFor='reserved' className='flex items-center text-xs font-medium'>
                           
                               {/* reserved input selector */}
                               <input 
                                   type='radio'
                                   {...register('reserved', {required: true})}
                                   className='mr-0.5'
                               />
                               Reserved
                           </label>
   
                           <label htmlFor='reserved' className='flex items-center text-xs font-medium mx-1'>
                           
                               {/* selected input selector */}
                               <input 
                                   type='radio'
                                   {...register('reserved', {required: true})}
                                   className='mr-0.5'
                               />
                               Selected
                           </label>
   
                           <label htmlFor='reserved' className='flex items-center text-xs font-medium'>
                               
                               {/* available input selector */}
                               <input 
                                   type='radio'
                                   {...register('reserved', {required: true})}
                                   className='mr-0.5'
                               />
                               Available
                           </label>
                       </div>
   
                   </div>
   
                    {/* date picker*/}
                   <div className='w-full h-full'>
                       <DayPicker
                           mode="range"
                           selected={selected}
                           onSelect={setSelected}
                           // footer={
                           //     selected && selected.length > 0 ? `Selected: ${selected.map(d => d.toLocaleDateString()).join(', ')}` : "Pick a day."
                           // }
                           classNames={{
                               day_selected:`!bg-(--primary) !text-white !rounded-sm`,
                               day_disabled: `!bg-(--text-gray) !rounded-sm !border !border-(--primary)`,
                               day: `hover:!rounded-sm w-8 h-8 hover:!bg-gray-200`,
                           }}
                       />
                   </div>
                   
               </div>
   
               {/* number of seats */}
               <div className="flex justify-between items-center bg-(--background-gray) rounded-md p-3 mt-4">
   
                  <div className='flex flex-col items-center'>
   
                       <span className='flex justify-start items-center text-xs text-(--text-gray)'>
                           <UsersRound className='w-6 h-4'/>
                           Choose Number of Seats
                       </span>
   
                       <span className='w-full text-[11px] text-(--text-gray) text-center'>
                           5 seats remaining
                       </span>
   
                   </div>
   
                  <div className='flex items-center justify-between w-28 h-8 bg-(--background-gray) rounded-sm px-2'>
                       {/* number of seats */}
   
                       {/* reduce number of seats */}
                       <button 
                           type='button'
                           className='w-8 h-8 flex justify-center items-center text-(--text-gray) bg-(--button-gray) rounded-sm hover:bg-gray-200'
                           onClick={(e) => {
                               e.preventDefault();
                               if (numberOfSeats > 0) {
                                   setNumberOfSeats(numberOfSeats - 1);
                               }
                           }} >
                           <Minus />
                       </button>
                       
                       {/* display number of seats */}
                       <span>{numberOfSeats}</span>
   
                       {/* increment number of seats */}
                       <button 
                           type='button'
                           className='w-8 h-8 flex justify-center items-center text-(--text-gray) bg-(--button-gray) rounded-sm hover:bg-gray-200'
                           onClick={(e) => {
                               e.preventDefault();
                               if (numberOfSeats < 5) { // assuming max seats is 5
                               setNumberOfSeats(numberOfSeats + 1);    
                           }}}
                       >
                           <Plus />
                       </button>
                  </div>
               </div>
   
               {/* time */}
               <div className={ (isOpen === true) ? 'w-full h-fit relative mb-[250px]' : '!mb-[110px]'}>
                   <div className='w-full h-[50px] bg-(--background-gray) rounded-md relative flex items-center justify-between px-5 mt-4'>    
                       <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                           <span className='flex items-center text-xs text-(--text-gray)'>
                               <Clock className='w-4 h-4 mr-1'/>
                               Choose Time
                           </span>
                           <DropdownMenuTrigger asChild>
                               <button
                                   className='w-8 h-8 flex justify-center items-center text-(--text-gray) bg-(--button-gray) rounded-sm hover:bg-gray-200'
                                   aria-label="Customise options"
                                   onClick={() => setIsOpen(!isOpen)}
                               >
                                   {(isOpen === false) ? <ChevronDown /> : <ChevronUp />}
                               </button>
                           </DropdownMenuTrigger>
   
                           <DropdownMenuPortal>
                               <DropdownMenuContent
                                   className="w-[335px] h-fit rounded-b-md p-4 bg-(--background-gray) will-change-[opacity,transform] data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade data-[side=right]:animate-slideLeftAndFade data-[side=top]:animate-slideDownAndFade"
                                   sideOffset={5}
                                   align='end'
                                   alignOffset={-20}
                               >
                                   
                                   {/* time input selector option*/}
                                   <DropdownMenuItem
                                       className="w-full h-[31px] px-5 rounded-sm group relative flex select-none justify-between items-center  hover:bg-(--button-gray) text-xs leading-none text-violet11 outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[disabled]:text-mauve8 data-[highlighted]:text-violet1"
                                   >
                                       All Day (9am - 5pm)
                                       {/* time input selector */}
                                       <input 
                                           type='radio'
                                           value="allDay"
                                           checked={timeValue === "allDay"}
                                           {...register('time', {required: true})}
                                           onClick={() => setIsCustom(false)}
                                       />
                                   </DropdownMenuItem>
   
   
                                  
                                   <DropdownMenuItem 
                                       className="w-full group flex flex-col relative h-fit select-none item-center text-xs leading-none text-violet11 outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[disabled]:text-mauve8 data-[highlighted]:text-violet1"
                                   >
                                       <label 
                                           onClick={() => setIsCustom(true)}
                                           className="w-full h-[31px] px-5 group relative select-none flex justify-between items-center hover:bg-(--button-gray) rounded-sm text-xs mb-4"
                                       >
                                           Custom
                                           {/* time input selector */}
                                           <input 
                                               type='radio'
                                               {...register('time', {required: true})}
                                               value="custom"
                                               checked={timeValue === "custom"}
                                               onClick={(e) => {
                                                   e.preventDefault();
                                                   setIsCustom(!isCustom)
                                               }}
                                           />
                                       </label>
   
                                       <div className={(isCustom ? "grid grid-cols-3 gap-1.5" : 'hidden')}>
                                       {
                                           timeData.map((time, index) => (
                                               <button
                                                   key={index} 
                                                   type='button'
                                                   className={'border hover:border-(--primary) w-24 h-8 text-xs font-medium rounded-sm' + ((customTime === time.value) ? ' bg-(--primary) text-white' : 'bg-(--button-gray) rounded-sm')}   
                                                   onClick={() => { 
                                                       setCustomTime(time.value); 
                                                   }} 
                                               >
                                                   {time.label}
                                               </button>
                                           ))
                                       }
                                       </div>
                                   </DropdownMenuItem>
                               </DropdownMenuContent>
                           </DropdownMenuPortal>
                       </DropdownMenu>
                   </div>
               </div>
                   
               
               <a 
                   href="/seatReservation" 
                   className="w-full h-8 text-xs font-semibold bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm flex justify-center items-center"
               >
                   Proceed
               </a>
               
           </form>
           
         </div>
    </section>
  )
}

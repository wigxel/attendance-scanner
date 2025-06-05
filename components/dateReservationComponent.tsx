import { Calendar, ChevronDown, ChevronLeft, ChevronUp, Clock, Minus, Plus, UsersRound } from 'lucide-react'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form';
import {DayPicker} from 'react-day-picker'
import "react-day-picker/dist/style.css";

interface FormData {
    reserved: boolean,
    available: boolean,
    selected: boolean
    time: string;
}

export default function DateReservationComponent() {

    const [selected, setSelected] = useState<Date>(); // user date selection
    const [isOpen, setIsOpen] = useState(false);
    const toggleDropdown = () => setIsOpen(prev => !prev);
    const [numberOfSeats, setNumberOfSeats] = useState<number>(0); // default number of seats

    const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();



  return (
    <div className="w-full sm:w-[335px] h-[812px] flex flex-col justify-start items-center">

        <nav className='w-full h-[99px] absolute top-0 flex items-center bg-(--navigation-gray) px-2.5 pt-12'>

            <button type='button'>
                <span className='w-8 h-8 text-left'><ChevronLeft /></span>
            </button>
            
            <div className='xl:w-full ml-20 xl:ml-0'>
                <h3 className='text-sm text-center font-semibold'>Reserve a seat</h3>
            </div>
        </nav>

        <form className='mt-38 xl:mt-12'>
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
                        mode="single"
                        selected={selected}
                        onSelect={setSelected}
                        // footer={
                        //     selected ? `Selected: ${selected.toLocaleDateString()}` : "Pick a day."
                        // }
                        classNames={{
                            day_selected:`!bg-(--primary) !text-white !rounded-sm`,
                            day_disabled: `!bg-(--text-gray) !rounded-sm !border !border-(--primary)`,
                            day: `hover:!rounded-sm !p-1 hover:!bg-gray-200`,
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
            <div className='w-full h-fit relative'> 
                <div className='w-full h-[50px] bg-(--background-gray) rounded-md relative flex items-center justify-between px-5 mt-4'>
                    <span className='flex items-center text-xs text-(--text-gray)'>
                        <Clock className='w-4 h-4 mr-1'/>
                        Choose Time
                    </span>

                    <label 
                        htmlFor="time" 
                        onClick={toggleDropdown}
                        className='w-8 h-8 flex justify-center items-center text-(--text-gray) bg-(--button-gray) rounded-sm hover:bg-gray-200'
                    >
                        {(isOpen === false) ? <ChevronDown /> : <ChevronUp />}
                    </label>
                    <ul 
                        id='time'
                        className={'w-full h-fit absolute right-0 top-11 rounded-b-xl p-4 bg-(--background-gray) text-xs text-(--text-gray) ' + (isOpen ? ' block' : ' hidden')}
                        onClick={() => setIsOpen(false)}
                    >
                        <li className='py-2 px-2 text-(--primary) hover:bg-(--navigation-gray) flex justify-between items-center rounded-sm'>
                            All Day (9am - 5pm)
                            {/* time input selector */}
                            <input 
                                type='radio'
                                {...register('time', {required: true})}
                                className='mr-0.5'
                            />
                        </li>
                        <li className='py-2 px-2 text-(--primary) hover:bg-(--navigation-gray) flex justify-between items-center rounded-sm'>
                            Custom
                            {/* time input selector */}
                            <input 
                                type='radio'
                                {...register('time', {required: true})}
                                className='mr-0.5'
                            />
                        </li>
                    </ul>
                </div>
            </div>
                
            
            <button 
                type="button" 
                className="w-full h-8 text-xs font-semibold bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm mt-[190px]"
            >
                Proceed
            </button>
            
        </form>
        
      </div>
  )
}

'use client'

import ReservationSummaryComponent from '@/components/reservationSummary';
import { useConvexAuth } from 'convex/react';
import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import RadioFilterComponent from '@/components/filter'
import SeatComponent from '@/components/seat'
import TableComponent from '@/components/table'

interface SeatReservationComponentProps {
    setIsNav: Dispatch<SetStateAction<boolean>>;
    setStep: Dispatch<SetStateAction<string>>;
    table: string;
    setTable: Dispatch<SetStateAction<string>>;
    seat: string;
    setSeat: Dispatch<SetStateAction<string>>;
}

interface FormData {
    filter: string
}

export default function SeatReservationComponent(
    {
        setIsNav, setStep,
        table, setTable,
        seat, setSeat
    }: SeatReservationComponentProps
) {

    const { isAuthenticated } = useConvexAuth();
    const router = useRouter();


    const [isConfirmed, setIsConfirmed] = useState(false);
    const [filter, setFilter] = useState('Available')
    const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();

    // useEffect(() => {
    //     // If user is not authenticated, redirect to sign-in page
    //     if (!isAuthenticated) {
    //     router.push("/userLogin");
    //     }
    // }, [isAuthenticated, router])
    
    const onSubmit = () =>{
        setIsConfirmed(true);
        // Here you can handle the form submission, e.g., send data to an API
    }

    // filter
    const filterOptions = [
        {id: 'reserved', label: 'Reserved'},
        {id: 'selected', label: 'Selected'},
        {id: 'available', label: 'Available'}
    ]

    console.log(filter)

  return (
    <section className="w-full h-screen flex justify-center items-start p-4 xl:p-0 mt-20 xl:mt-6" >
        {
            (isConfirmed === false) ? 
            <div className={"w-[335px] sm:w-[335px] h-fit flex flex-col justify-center items-center"}>
                
                {/* reservation */}
                <div className='w-[335px] max-w-[335px] h-11 flex items-center justify-center mt-24'>
                
                    <div className='w-full flex justify-between items-center'>
                        {
                            filterOptions.map((item, index) => (
                                <RadioFilterComponent key={index} id={item.id} label={item.label} register={register} filter={filter} setFilter={setFilter}/>
                            ))
                        }
                    </div>
        
                </div>
        
                {/* section 1 */}
                <div className='w-full sm:max-w-[335px] h-[150px] sm:max-h-[150px] flex justify-between items-center'>
                    {/* first table and seats */}
                    <div className="w-1/2 h-full flex justify-center items-center">
        
                        <div className='relative bottom-[65%] left-[25%]'> 
                            {/* Table T1 */}
                            
                            <TableComponent 
                                id='T1' 
                                label='T1' 
                                onClick={setTable}
                                size='w-[51px] h-[99px] rounded-[10px]' 
                                position='left-[calc(50%-25.5px-74px)] top-[45px]' 
                                tableRotation='-rotate-90'
                                textRotation='!rotate-90'
                            />

        
                            {/* Seat S1 */}
                            <button 
                                type='button'
                                onClick={()=> {
                                    if (table === 'T1') setSeat('S1');
                                }}
                                className="absolute w-4 h-[31px] left-[calc(50%-8px-105px)] top-[35px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)"
                            >
                                <span className='!-rotate-90 text-xs'>
                                    S1
                                    {/* seat bar S1 */}
                                    <div className=" absolute w-1 h-[39px] left-[4px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                </span>
                            </button>
        
                            {/* Seat S2 */}
                            <button
                                type='button'
                                onClick={()=> {
                                    if (table === 'T1') setSeat('S2');
                                }}
                                className="seat absolute w-4 h-[31px] left-[calc(50%-8px-42px)] top-[35px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                                <span className='!-rotate-90 text-xs'>
                                    S2
                                    {/* seat bar S1 */}
                                    <div className=" absolute w-1 h-[39px] right-[4px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                </span>
                            </button>
                        </div>
                    </div>
                    {/* Second table and seats */}
                    <div className="w-1/2 h-full flex justify-center items-center">
        
                        <div className='relative top-[40%] left-[70%] rotate-90'>
                            {/* Table T2 */}
                            
                            <TableComponent 
                                id='T2' 
                                label='T2' 
                                onClick={setTable}
                                size='w-[51px] h-[99px] rounded-[10px]' 
                                position='left-[calc(50%-25.5px-74px)] top-[45px]' 
                                tableRotation='-rotate-90'
                                textRotation='!rotate-0'
                            />
        
                            {/* Seat S1 */}
                            <button
                                type='button' 
                                onClick={()=> {
                                    if (table === 'T2') setSeat('S2');
                                }}
                                className="absolute w-4 h-[31px] left-[calc(50%-8px-105px)] top-[35px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                                <span className='!-rotate-90 text-xs'>
                                    S1
                                    {/* seat bar S1 */}
                                    <div className=" absolute w-1 h-[39px] left-[4px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                </span>
                            </button>
        
                            {/* Seat S2 */}
                            <button
                                type='button' 
                                onClick={()=> {
                                    if (table === 'T2') setSeat('S2');
                                }}
                                className="seat absolute w-4 h-[31px] left-[calc(50%-8px-42px)] top-[35px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                                <span className='!-rotate-90 text-xs'>
                                    S2
                                    {/* seat bar S2 */}
                                    <div className=" absolute w-1 h-[39px] right-[4px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                </span>
                            </button>
        
                            {/* Seat S3 */}
                            <button
                                type='button' 
                                onClick={()=> {
                                    if (table === 'T2') setSeat('S3');
                                }}
                                className="seat absolute w-4 h-[31px] left-[calc(50%-8px-8px)] top-[80px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-0 group border hover:border-(--primary)">
                                <span className='!-rotate-90 text-xs'>
                                    S3
                                    {/* seat bar S3 */}
                                    <div className=" absolute w-1 h-[39px] right-[4px] top-[2px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                </span>
                            </button>
        
                        </div>
                        
                    </div>
                </div>
        
                {/* section 2 */}
                <div className='w-full sm:max-w-[335px] h-[150px] sm:max-h-[150px] flex justify-between items-center my-12'>
                    {/* third table and seats */}
                    <div className="w-1/2 h-full flex justify-center items-center">
        
                        <div className='relative bottom-[65%] left-[25%]'> 
                            {/* Table T3 */}
                            <TableComponent 
                                id='T3' 
                                label='T3' 
                                onClick={setTable}
                                size='w-[83px] h-[158px] rounded-full' 
                                position='left-[calc(50%-25.5px-61px)] top-[30px]' 
                                tableRotation='-rotate-90'
                                textRotation='!rotate-90'
                            />
        
                            {/* Seat S1 */}
                            <button 
                                type='button'
                                onClick={()=> {
                                    if (table === 'T3') setSeat('S1');
                                }}
                                className="absolute w-4 h-[31px] left-[calc(50%-8px-105px)] top-[35px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded -rotate-290 group border hover:border-(--primary)">
                                <span className='!-rotate-90 text-xs'>
                                    S1
                                    {/* seat bar S1 */}
                                    <div className=" absolute w-1 h-[39px] left-[5px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                </span>
                            </button>
        
                            {/* Seat S2 */}
                            <button 
                                type='button'
                                onClick={()=> {
                                    if (table === 'T3') setSeat('S2');
                                }}
                                className="seat absolute w-4 h-[31px] left-[calc(50%-8px-42px)] top-[35px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                                <span className='!-rotate-90 text-xs'>
                                    S2
                                    {/* seat bar S2 */}
                                    <div className=" absolute w-1 h-[39px] right-[5px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                </span>
                            </button>
        
                            {/* Seat S3 */}
                            <button 
                                type='button'
                                onClick={()=> {
                                    if (table === 'T3') setSeat('S3');
                                }}
                                className="absolute w-4 h-[31px] -left-[calc(50%-8px-0px)] top-[34px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-110 group border hover:border-(--primary)">
                                <span className='!-rotate-90 text-xs'>
                                    S3
                                    {/* seat bar S3 */}
                                    <div className=" absolute w-1 h-[39px] left-[6px] -top-[24px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                </span>
                            </button>
        
                            {/* Seat S4 */}
                            <button 
                                type='button'
                                onClick={()=> {
                                    if (table === 'T3') setSeat('S4');
                                }}
                                className="absolute w-4 h-[31px] left-[calc(50%-8px-105px)] top-[150px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-110 group border hover:border-(--primary)">
                                <span className='!-rotate-90 text-xs'>
                                    S4
                                    {/* seat bar S4 */}
                                    <div className=" absolute w-1 h-[39px] left-[8px] top-[2px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                </span>
                            </button>
        
                            {/* Seat S5 */}
                            <button 
                                type='button'
                                onClick={()=> {
                                    if (table === 'T3') setSeat('S5');
                                }}
                                className="seat absolute w-4 h-[31px] left-[calc(50%-8px-42px)] top-[155px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                                <span className='!-rotate-90 text-xs'>
                                    S5
                                    {/* seat bar S5 */}
                                    <div className=" absolute w-1 h-[39px] right-[5px] top-[1px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                </span>
                            </button>
        
                            {/* Seat S6 */}
                            <button 
                                type='button'
                                onClick={()=> {
                                    if (table === 'T3') setSeat('S6');
                                }}
                                className="absolute w-4 h-[31px] -left-[calc(50%-8px-0px)] top-[150px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-70 group border hover:border-(--primary)">
                                <span className='!-rotate-90 text-xs'>
                                    S6
                                    {/* seat bar S6 */}
                                    <div className=" absolute w-1 h-[39px] left-[7px] top-[1px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                </span>
                            </button>
        
                        </div>
                    </div>
                    {/* fourth table and seats */}
                    <div className="w-1/2 h-full flex justify-center items-center">
        
                        <div className='relative top-[40%] left-[70%] rotate-90'>
                            {/* (fourth) Table Hub Manager */}
                            
                            <TableComponent 
                                id='Hub Manager' 
                                label='Hub Manager' 
                                onClick={setTable}
                                size='w-[59px] h-[74px] rounded-[10px]' 
                                position='left-[calc(50%-25.5px-54px)] top-[62px]' 
                                tableRotation='-rotate-90'
                                textRotation='!rotate-0 text-center'
                            />

                            {/* Seat S1 */}
                            <button 
                                type='button'
                                onClick={()=> {
                                    if (table === 'Hub Manager') setSeat('S1');
                                }}
                                className="absolute w-4 h-[31px] left-[calc(50%-8px-52px)] top-[35px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                                <span className='!-rotate-90 text-xs'>
                                    {/* seat bar S1 */}
                                    <div className=" absolute w-1 h-[39px] -left-[1px] -top-[32px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                </span>
                            </button>
        
                        </div>
                        
                    </div>
                </div>
        
                {/* section 3 */}
                <div className='w-full sm:max-w-[335px] h-[150px] sm:max-h-[150px] flex justify-between items-center mb-[110px]'>
                    {/* fifth table and seats */}
                    <div className="w-1/2 h-full flex justify-center items-center">
        
                        <div className='relative bottom-[65%] left-[25%]'> 
                            {/* Table T4 */}

                            <TableComponent 
                                id='T4' 
                                label='T4' 
                                onClick={setTable}
                                size='w-[83px] h-[158px] rounded' 
                                position='left-[calc(50%-25.5px-61px)] top-[30px]' 
                                tableRotation='-rotate-90'
                                textRotation='!rotate-90'
                            />
        
                            {/* Seat S1 */}
                            <button 
                                type='button'
                                onClick={()=> {
                                    if (table === 'T4') setSeat('S1');
                                }}
                                className="absolute w-4 h-[31px] left-[calc(50%-8px-105px)] top-[35px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                                <span className='!-rotate-90 text-xs'>
                                    S1
                                    {/* seat bar S1 */}
                                    <div className=" absolute w-1 h-[39px] left-[5px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                </span>
                            </button>
        
                            {/* Seat S2 */}
                            <button
                                type='button' 
                                onClick={()=> {
                                    if (table === 'T4') setSeat('S2');
                                }}
                                className="seat absolute w-4 h-[31px] left-[calc(50%-8px-42px)] top-[35px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                                <span className='!-rotate-90 text-xs'>
                                    S2
                                    {/* seat bar S2 */}
                                    <div className=" absolute w-1 h-[39px] right-[5px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                </span>
                            </button>
        
                            {/* Seat S3 */}
                            <button
                                type='button' 
                                onClick={()=> {
                                    if (table === 'T4') setSeat('S3');
                                }}
                                className="absolute w-4 h-[31px] -left-[calc(50%-8px-0px)] top-[34px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                                <span className='!-rotate-90 text-xs'>
                                    S3
                                    {/* seat bar S3 */}
                                    <div className=" absolute w-1 h-[39px] left-[6px] -top-[24px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                </span>
                            </button>
        
                            {/* Seat S4 */}
                            <button
                                type='button' 
                                onClick={()=> {
                                    if (table === 'T4') setSeat('S4');
                                }}
                                className="absolute w-4 h-[31px] left-[calc(50%-8px-105px)] top-[150px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                                <span className='!-rotate-90 text-xs'>
                                    S4
                                    {/* seat bar S4 */}
                                    <div className=" absolute w-1 h-[39px] left-[8px] top-[2px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                </span>
                            </button>
        
                            {/* Seat S5 */}
                            <button
                                type='button'
                                onClick={()=> {
                                    if (table === 'T4') setSeat('S5');
                                }}
                                className="seat absolute w-4 h-[31px] left-[calc(50%-8px-42px)] top-[150px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                                <span className='!-rotate-90 text-xs'>
                                    S5
                                    {/* seat bar S5 */}
                                    <div className=" absolute w-1 h-[39px] right-[5px] top-[1px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                </span>
                            </button>
        
                            {/* Seat S6 */}
                            <button
                                type='button' 
                                onClick={()=> {
                                    if (table === 'T4') setSeat('S6');
                                }}
                                className="absolute w-4 h-[31px] -left-[calc(50%-8px-0px)] top-[150px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                                <span className='!-rotate-90 text-xs'>
                                    S6
                                    {/* seat bar S6 */}
                                    <div className=" absolute w-1 h-[39px] left-[7px] top-[1px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                </span>
                            </button>
        
                        </div>
                    </div>
                    {/* sixth table and seats */}
                    <div className="w-1/2 h-full flex justify-center items-center">
        
                        {/* sixth table and seats */}
                        <div className="w-1/2 h-full flex justify-center items-center">
        
                            <div className='relative top-[40%] -right-[135%] rotate-90'>
                                {/* Table T5 */}
                                <TableComponent 
                                    id='T5' 
                                    label='T5' 
                                    onClick={setTable}
                                    size='w-[59px] h-[114px] rounded-[10px]' 
                                    position='left-[calc(50%-25.5px-40px)] top-[35px]' 
                                    tableRotation='-rotate-90'
                                    textRotation='!rotate-0'
                                />
        
                                {/* Seat S1 */}
                                <button
                                    type='button' 
                                    onClick={()=> {
                                    if (table === 'T5') setSeat('S1');
                                }}
                                    className="absolute w-4 h-[31px] left-[calc(50%-8px-75px)] top-[30px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                                    <span className='!-rotate-90 text-xs'>
                                        S1
                                        {/* seat bar S1 */}
                                        <div className=" absolute w-1 h-[39px] left-[4px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                    </span>
                                </button>
        
                                {/* Seat S2 */}
                                <button
                                    type='button' 
                                    onClick={()=> {
                                        if (table === 'T5') setSeat('S2');
                                    }}
                                    className="seat absolute w-4 h-[31px] right-[calc(50%-8px-4px)] top-[30px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                                    <span className='!-rotate-90 text-xs'>
                                        S2
                                        {/* seat bar S2 */}
                                        <div className=" absolute w-1 h-[39px] right-[4px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                    </span>
                                </button>
        
                                {/* Seat S3 */}
                                <button
                                    type='button' 
                                    onClick={()=> {
                                        if (table === 'T5') setSeat('S3');
                                    }}
                                    className="seat absolute w-4 h-[31px] left-[calc(50%-8px-110px)] top-[75px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded rotate-0 group border hover:border-(--primary)">
                                    <span className='!-rotate-90 text-xs'>
                                        S3
                                        {/* seat bar S3 */}
                                        <div className=" absolute w-1 h-[39px] right-[4px] -top-[23px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                                    </span>
                                </button>
        
                            </div>
        
                        </div>
                        
                    </div>
                </div>
        
                <button 
                    type="button" 
                    className="w-full h-8 text-xs font-semibold bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm"
                    onClick={
                        () => onSubmit()
                    }
                >
                    Confirm and Proceed
                </button>
            </div> :
            <ReservationSummaryComponent setIsConfirmed={setIsConfirmed} isConfirmed={isConfirmed} />
        }
    </section>
  )
}
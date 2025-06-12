import { ChevronLeft } from 'lucide-react'
import React from 'react'

export default function SeatSelectionComponent() {
  return (
    <div className="w-full sm:w-[335px] h-[812px] flex flex-col justify-center items-center">
        <nav className='w-full h-[99px] absolute top-0 flex items-center bg-(--navigation-gray) px-2.5 pt-12'>
        
            <button type='button'>
                <span className='w-8 h-8 text-left'><ChevronLeft /></span>
            </button>
            
            <div className='xl:w-full ml-20 xl:ml-0'>
                <h3 className='text-sm text-center font-semibold'>Reserve a seat</h3>
            </div>

        </nav>
        {/* section 1 */}
        <div className='w-full sm:max-w-[335px] h-[150px] sm:max-h-[150px] flex justify-between items-center'>
            {/* first table and seats */}
            <div className="w-1/2 h-full flex justify-center items-center">

                <div className='relative bottom-[65%] left-[25%]'> 
                    {/* Table T1 */}
                    <div 
                        className="absolute w-[51px] h-[99px] left-[calc(50%-25.5px-74px)] top-[45px] flex items-center justify-center bg-[#D9D9D9] rounded-[10px] -rotate-90 border hover:border-(--primaryy)"
                    >
                        <span className='!rotate-90 text-xs relative'>
                            T1
                        </span>
                    </div>

                    {/* Seat S1 */}
                    <div className="absolute w-4 h-[31px] left-[calc(50%-8px-105px)] top-[35px]  flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                        <span className='!-rotate-90 text-xs'>
                            S1
                            {/* seat bar S1 */}
                            <div className=" absolute w-1 h-[39px] left-[4px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                        </span>
                    </div>

                    {/* Seat S2 */}
                    <div className="seat absolute w-4 h-[31px] left-[calc(50%-8px-42px)] top-[35px] flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                        <span className='!-rotate-90 text-xs'>
                            S2
                            {/* seat bar S1 */}
                            <div className=" absolute w-1 h-[39px] right-[4px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                        </span>
                    </div>
                </div>
            </div>
            {/* Second table and seats */}
            <div className="w-1/2 h-full flex justify-center items-center">

                <div className='relative top-[40%] left-[70%] rotate-90'>
                    {/* Table T2 */}
                    <div 
                        className="absolute w-[51px] h-[99px] left-[calc(50%-25.5px-74px)] top-[45px] flex items-center justify-center bg-[#D9D9D9] rounded-[10px] -rotate-90 border hover:border-(--primaryy)"
                    >
                        <span className='!rotate-0 text-xs relative'>
                            T2
                        </span>
                    </div>

                    {/* Seat S1 */}
                    <div className="absolute w-4 h-[31px] left-[calc(50%-8px-105px)] top-[35px]  flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                        <span className='!-rotate-90 text-xs'>
                            S1
                            {/* seat bar S1 */}
                            <div className=" absolute w-1 h-[39px] left-[4px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                        </span>
                    </div>

                    {/* Seat S2 */}
                    <div className="seat absolute w-4 h-[31px] left-[calc(50%-8px-42px)] top-[35px] flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                        <span className='!-rotate-90 text-xs'>
                            S2
                            {/* seat bar S2 */}
                            <div className=" absolute w-1 h-[39px] right-[4px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                        </span>
                    </div>

                    {/* Seat S3 */}
                    <div className="seat absolute w-4 h-[31px] left-[calc(50%-8px-8px)] top-[80px] flex items-center justify-center bg-[#D9D9D9] rounded rotate-0 group border hover:border-(--primary)">
                        <span className='!-rotate-90 text-xs'>
                            S3
                            {/* seat bar S3 */}
                            <div className=" absolute w-1 h-[39px] right-[4px] top-[2px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                        </span>
                    </div>

                </div>
                
            </div>
        </div>

        {/* section 2 */}
        <div className='w-full sm:max-w-[335px] h-[150px] sm:max-h-[150px] flex justify-between items-center my-12'>
            {/* third table and seats */}
            <div className="w-1/2 h-full flex justify-center items-center">

                <div className='relative bottom-[65%] left-[25%]'> 
                    {/* Table T3 */}
                    <div 
                        className="absolute w-[83px] h-[158px] left-[calc(50%-25.5px-61px)] top-[30px] flex items-center justify-center bg-[#D9D9D9] rounded-full -rotate-90 border hover:border-(--primaryy)"
                    >
                        <span className='!rotate-90 text-xs relative'>
                            T3
                        </span>
                    </div>

                    {/* Seat S1 */}
                    <div className="absolute w-4 h-[31px] left-[calc(50%-8px-105px)] top-[35px] flex items-center justify-center bg-[#D9D9D9] rounded -rotate-290 group border hover:border-(--primary)">
                        <span className='!-rotate-90 text-xs'>
                            S1
                            {/* seat bar S1 */}
                            <div className=" absolute w-1 h-[39px] left-[5px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                        </span>
                    </div>

                    {/* Seat S2 */}
                    <div className="seat absolute w-4 h-[31px] left-[calc(50%-8px-42px)] top-[35px] flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                        <span className='!-rotate-90 text-xs'>
                            S2
                            {/* seat bar S2 */}
                            <div className=" absolute w-1 h-[39px] right-[5px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                        </span>
                    </div>

                    {/* Seat S3 */}
                    <div className="absolute w-4 h-[31px] -left-[calc(50%-8px-0px)] top-[34px]  flex items-center justify-center bg-[#D9D9D9] rounded rotate-110 group border hover:border-(--primary)">
                        <span className='!-rotate-90 text-xs'>
                            S3
                            {/* seat bar S3 */}
                            <div className=" absolute w-1 h-[39px] left-[6px] -top-[24px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                        </span>
                    </div>

                    {/* Seat S4 */}
                    <div className="absolute w-4 h-[31px] left-[calc(50%-8px-105px)] top-[150px] flex items-center justify-center bg-[#D9D9D9] rounded rotate-110 group border hover:border-(--primary)">
                        <span className='!-rotate-90 text-xs'>
                            S4
                            {/* seat bar S4 */}
                            <div className=" absolute w-1 h-[39px] left-[8px] top-[2px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                        </span>
                    </div>

                    {/* Seat S5 */}
                    <div className="seat absolute w-4 h-[31px] left-[calc(50%-8px-42px)] top-[155px] flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                        <span className='!-rotate-90 text-xs'>
                            S5
                            {/* seat bar S5 */}
                            <div className=" absolute w-1 h-[39px] right-[5px] top-[1px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                        </span>
                    </div>

                    {/* Seat S6 */}
                    <div className="absolute w-4 h-[31px] -left-[calc(50%-8px-0px)] top-[150px] flex items-center justify-center bg-[#D9D9D9] rounded rotate-70 group border hover:border-(--primary)">
                        <span className='!-rotate-90 text-xs'>
                            S6
                            {/* seat bar S6 */}
                            <div className=" absolute w-1 h-[39px] left-[7px] top-[1px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                        </span>
                    </div>

                </div>
            </div>
            {/* fourth table and seats */}
            <div className="w-1/2 h-full flex justify-center items-center">

                <div className='relative top-[40%] left-[70%] rotate-90'>
                    {/* (fourth) Table Hub Manager */}
                    <div 
                        className="absolute w-[59px] h-[74px] left-[calc(50%-25.5px-54px)] top-[62px] flex items-center justify-center bg-[#D9D9D9] rounded-[10px] -rotate-90 border hover:border-(--primaryy)"
                    >
                        <span className='!rotate-0 text-xs relative text-center'>
                            Hub Manager
                        </span>
                    </div>

                    {/* Seat S1 */}
                    <div className="absolute w-4 h-[31px] left-[calc(50%-8px-52px)] top-[35px] flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                        <span className='!-rotate-90 text-xs'>
                            {/* seat bar S1 */}
                            <div className=" absolute w-1 h-[39px] -left-[1px] -top-[32px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                        </span>
                    </div>

                </div>
                
            </div>
        </div>

        {/* section 3 */}
        <div className='w-full sm:max-w-[335px] h-[150px] sm:max-h-[150px] flex justify-between items-center mb-[110px]'>
            {/* fifth table and seats */}
            <div className="w-1/2 h-full flex justify-center items-center">

                <div className='relative bottom-[65%] left-[25%]'> 
                    {/* Table T5 */}
                    <div 
                        className="absolute w-[83px] h-[158px] left-[calc(50%-25.5px-61px)] top-[30px] flex items-center justify-center bg-[#D9D9D9] rounded -rotate-90 border hover:border-(--primaryy)"
                    >
                        <span className='!rotate-90 text-xs relative'>
                            T4
                        </span>
                    </div>

                    {/* Seat S1 */}
                    <div className="absolute w-4 h-[31px] left-[calc(50%-8px-105px)] top-[35px] flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                        <span className='!-rotate-90 text-xs'>
                            S1
                            {/* seat bar S1 */}
                            <div className=" absolute w-1 h-[39px] left-[5px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                        </span>
                    </div>

                    {/* Seat S2 */}
                    <div className="seat absolute w-4 h-[31px] left-[calc(50%-8px-42px)] top-[35px] flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                        <span className='!-rotate-90 text-xs'>
                            S2
                            {/* seat bar S2 */}
                            <div className=" absolute w-1 h-[39px] right-[5px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                        </span>
                    </div>

                    {/* Seat S3 */}
                    <div className="absolute w-4 h-[31px] -left-[calc(50%-8px-0px)] top-[34px]  flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                        <span className='!-rotate-90 text-xs'>
                            S3
                            {/* seat bar S3 */}
                            <div className=" absolute w-1 h-[39px] left-[6px] -top-[24px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                        </span>
                    </div>

                    {/* Seat S4 */}
                    <div className="absolute w-4 h-[31px] left-[calc(50%-8px-105px)] top-[150px] flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                        <span className='!-rotate-90 text-xs'>
                            S4
                            {/* seat bar S4 */}
                            <div className=" absolute w-1 h-[39px] left-[8px] top-[2px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                        </span>
                    </div>

                    {/* Seat S5 */}
                    <div className="seat absolute w-4 h-[31px] left-[calc(50%-8px-42px)] top-[150px] flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                        <span className='!-rotate-90 text-xs'>
                            S5
                            {/* seat bar S5 */}
                            <div className=" absolute w-1 h-[39px] right-[5px] top-[1px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                        </span>
                    </div>

                    {/* Seat S6 */}
                    <div className="absolute w-4 h-[31px] -left-[calc(50%-8px-0px)] top-[150px] flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                        <span className='!-rotate-90 text-xs'>
                            S6
                            {/* seat bar S6 */}
                            <div className=" absolute w-1 h-[39px] left-[7px] top-[1px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                        </span>
                    </div>

                </div>
            </div>
            {/* sixth table and seats */}
            <div className="w-1/2 h-full flex justify-center items-center">

                {/* sixth table and seats */}
                <div className="w-1/2 h-full flex justify-center items-center">

                    <div className='relative top-[40%] -right-[135%] rotate-90'>
                        {/* Table T2 */}
                        <div 
                            className="absolute w-[59px] h-[114px] left-[calc(50%-25.5px-40px)] top-[35px] flex items-center justify-center bg-[#D9D9D9] rounded-[10px] -rotate-90 border hover:border-(--primaryy)"
                        >
                            <span className='!rotate-0 text-xs relative'>
                                T5
                            </span>
                        </div>

                        {/* Seat S1 */}
                        <div className="absolute w-4 h-[31px] left-[calc(50%-8px-75px)] top-[30px]  flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                            <span className='!-rotate-90 text-xs'>
                                S1
                                {/* seat bar S1 */}
                                <div className=" absolute w-1 h-[39px] left-[4px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                            </span>
                        </div>

                        {/* Seat S2 */}
                        <div className="seat absolute w-4 h-[31px] right-[calc(50%-8px-4px)] top-[30px] flex items-center justify-center bg-[#D9D9D9] rounded rotate-90 group border hover:border-(--primary)">
                            <span className='!-rotate-90 text-xs'>
                                S2
                                {/* seat bar S2 */}
                                <div className=" absolute w-1 h-[39px] right-[4px] -top-[25px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                            </span>
                        </div>

                        {/* Seat S3 */}
                        <div className="seat absolute w-4 h-[31px] left-[calc(50%-8px-110px)] top-[75px] flex items-center justify-center bg-[#D9D9D9] rounded rotate-0 group border hover:border-(--primary)">
                            <span className='!-rotate-90 text-xs'>
                                S3
                                {/* seat bar S3 */}
                                <div className=" absolute w-1 h-[39px] right-[4px] -top-[23px] bg-[#D9D9D9] rounded rotate-90 border group-hover:border-(--primary)" />
                            </span>
                        </div>

                    </div>

                </div>
                
            </div>
        </div>

        <button 
            type="button" 
            className="w-full h-8 text-xs font-semibold bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm"
        >
            Confirm and Proceed
        </button>
    </div>
  )
}
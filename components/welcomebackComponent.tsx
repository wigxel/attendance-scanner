import { Minus, MoveRight } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react';
import React, { useState } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import "react-day-picker/dist/style.css";



export default function WelcomebackComponent() {


    const [selected, setSelected] = useState<DateRange | undefined>(); // user date selection

  return (
     <section className="w-full h-screen flex justify-center items-center p-4 xl:!p-6">

      {/* login options */}
      <div className="w-full sm:max-w-[335px] h-[812px] flex flex-col justify-center items-center">
        {/* header text */}
          <header className="w-full h-fit flex flex-col justify-center items-start">
            <h3 className="text-xl">Hello, Sim Fubara <span className="text-lg font-light">&#x1F44B;</span></h3>
            <h1 className="text-2xl font-semibold my-2 subpixel-antialiased">Welcome Back</h1>
          </header>

        {/* qr code */}
        <div 
            id="mountNodes" 
            className='w-[335px] sm:max-w-[335px] h-[363px] sm:max-h-[363px] flex flex-col justify-center items-center bg-(--background-gray) px-x py-4 mb-4 rounded-md'
        >
            <QRCodeSVG 
                value="https://picturesofpeoplescanningqrcodes.tumblr.com/" 
                size={150}
                level={"H"}
                className='h-full'
            />

            {/* QR code footer */}
            <p className='text-xs text-(--text-gray) font-medium mt-4'>Present QR Code to Staff at Check-in Counter</p>

        </div>

        {/* date picker*/}
        <div className='w-full sm:w-[335px] h-[350px] flex flex-col justify-center items-start rounded-lg bg-(--background-gray) px-2 py-12 mb-4'>
            
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
                    day: `hover:!rounded-sm w-8 h-8 hover:!bg-gray-200 !text-sm !font-medium`,
                    month: `w-full h-fit !rounded-lg`,
                    caption: `w-full justify-between items-center flex !font-semibold !text-3xl !mb-2`,
                    nav_button: `w-8 h-8 !bg-(--button-gray) rounded-sm !text-(--primary) hover:!text-(--primary-hover) !p-1.5 !mx-1`,
                }}
            />
            
            {/* CTA */}
            <button
                type="button"
                className="w-[232] sm:max-w[232px] h-8 flex items-center justify-between text-xs font-semibold text-left px-4 bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm mb-4 mx-4"
            >
                Make a Reservation
                <span className="flex">
                <Minus className="-mr-2" />
                <Minus className="-mr-2" />
                <MoveRight />
                </span>
            </button>
        </div>

        {/* Enroll option */}
        <div className="w-full h-fit mt-6">
         
            <div
                className="w-full sm:w-[335px] h-[232px] flex flex-col justify-center rounded-lg bg-(--background-gray) px-6 py-12 mb-4"
            >
                {/* header text */}
                <h1 className="font-semibold text-base">
                    Code. Create. Launch
                </h1>
                {/* description */}
                <p className="w-full text-sm font-normal tracking-wide py-4">
                    Hands-on training in tech and digital skills-empowering the next generation of innovators and problem-solvers.
                </p>
                {/* CTA */}
                <button
                    type="button"
                    className="w-[232] sm:max-w[232px] h-8 flex items-center justify-between text-xs font-semibold text-left px-4 bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm mb-4"
                >
                    Enroll Today
                    <span className="flex">
                    <Minus className="-mr-2" />
                    <Minus className="-mr-2" />
                    <MoveRight />
                    </span>
                </button>
            </div>
        </div>

      </div>
    </section>
  )
}



            // <DateCalendar days={parsed_dates} month={month} setMonth={setMonth} />
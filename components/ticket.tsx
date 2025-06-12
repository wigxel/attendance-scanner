import React from "react";
import Barcode from 'react-barcode';

export default function TicketComponent() {
  return (
    <div className="relative w-[335px] max-w-[335px] h-[445px] mx-auto mt-[50px] bg-(--background-gray) rounded-md  overflow-hidden">

      {/* Left side circle */}
      <div className="absolute w-[31px] h-[30px] bg-(--background) rounded-full left-[-13px] top-[135px] transform -translate-y-1/2"></div>

      {/* Right side circle */}
      <div className="absolute w-[31px] h-[30px] bg-(--background) rounded-full right-[-13px] top-[135px] transform -translate-y-1/2"></div>

      {/* Top content */}
      <div className="w-full h-[135px] flex flex-col items-center justify-center px-4 py-8 border-b-3 border-dashed ">
        <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">Name</h1>
            <span className="text-xs font-semibold">Sim Fubara</span>
        </div>
        <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">Phone</h1>
            <span className="text-xs font-semibold">08041941941</span>
        </div>
        <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">Email</h1>
            <span className="text-xs font-semibold">simfubara@gmail.com</span>
        </div>
      </div>

      {/* Bottom content */}
      <div className="w-full h-[310px] flex flex-col items-center justify-start text-center px-4 py-8">
       <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">Reservation ID</h1>
            <span className="text-xs font-semibold">Sim Fubara</span>
        </div>
        <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">Duration</h1>
            <span className="text-xs font-semibold">1hr</span>
        </div>
        <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">Table No.</h1>
            <span className="text-xs font-semibold">T2-S1, S2, S3</span>
        </div>
        <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">No. of Seats</h1>
            <span className="text-xs font-semibold">3</span>
        </div>
        <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">Reservation Date</h1>
            <span className="text-xs font-semibold">22nd May, 2025</span>
        </div>
        <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">Payment Status</h1>
            <span className="text-xs font-semibold">Paid</span>
        </div>
         <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-xs font-medium text-(--text-gray)">Amount</h1>
            <span className="text-xs font-semibold">N3000.00</span>
        </div>
        <footer className="w-full h-fit flex justify-center items-center">
            <div className="w-[206px] max-w-[206px] h-[67px] max-h-[67px]">
                <Barcode 
                    value="barcode-examdddple" 
                    width={1} 
                    height={50}
                    format="CODE128"
                    displayValue={false}
                    background="transparent"
                    marginTop={20}
                    marginLeft={-25}
                />
            </div>
        </footer>
      </div>
      

      {/* Bottom dots */}
      <div className="absolute bottom-[-3px] left-[2px] flex space-x-[9px] px-3">
        {[...Array(26)].map((_, i) => (
          <div key={i} className="w-[11px] h-[12px] bg-(--background) rounded-full"></div>
        ))}
      </div>
      
      <button 
        type="button" 
        className="w-full h-8 text-xs font-semibold bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm mt-[140px]"
      >
        Return to Homepage
      </button>

    </div>
  );
}

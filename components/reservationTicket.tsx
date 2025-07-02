'use client';

import React from "react";
import Barcode from 'react-barcode';
import { DateRange } from "react-day-picker";
import { SeatObject } from "./seat";

type ReservationTicketComponentProps = {
  selected: DateRange | undefined
  timeValue: string
  numberOfSeats: number
  table: string[]
  seat: SeatObject[]
};
export default function ReservationTicketComponent(
  {
    selected, timeValue, 
    numberOfSeats, table, seat 
  }:
    ReservationTicketComponentProps 
  ){

  const seatToTable = (seatOption) => {
        // Exact match for Hub manager
        if (seatOption === 'Hub Manager') return 'Hub Manager';

        // Match 't1s1' → 'T1', 't2s3' → 'T2', etc.
        const match = seatOption.match(/^t(\d+)/i);
        return match ? `T${match[1]}` : null;
    };

    /* -------------------------------------------------
    rebuild table into to take the shape T1 - S1, T3 - S1, S2, S3, T4 - S2
    ------------------------------------------------- */
    const mappedTable = table.reduce((acc, tableElement) => {
        // all seats that belong to this table
        const reserved = seat.filter(
            (s) => seatToTable(s.option) === tableElement
        );

        if (reserved.length) {
            acc.push({ tableElement, seatReserved: reserved });
        }
        return acc;
    }, []);

    const data = [
      {id: 1, field: 'Name', val: 'Sim Fubara'},
      {id: 2, field: 'Phone', val: '08041941941'},
      {id: 3, field: 'Email', val: 'simfubara@gmail.com'},
      {id: 4, field: 'Reservation ID', val: 'Sim Fubara'},
      {id: 5, field: 'Duration', val: timeValue},
      {
        id: 6,
        field: 'Table No.', 
        val: mappedTable.map((item) => {
          const seatNames = item.seatReserved.map((s) => s.name).join(', ');
          return `${item.tableElement} - ${seatNames}`;
        }).join('; ') // separate multiple tables with semicolon
      },
      {id: 7, field: 'No. of Seats', val: numberOfSeats},
      {id: 8, field: 'Reservation Date', val: selected},
      {id: 9, field: 'Payment Status', val: 'Not Paid'},
      {id: 10, field: 'Amount', val: 'N3000.00'}
    ]

  return (

    <section className="w-full h-screen flex flex-col justify-center">
      <div className="relative w-[335px] max-w-[335px] h-[445px] mx-auto bg-(--background-gray) rounded-md overflow-hidden">

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
              <span className="text-xs font-semibold">{timeValue}</span>
          </div>
          <div className="w-full flex justify-between items-center mb-2">
              <h1 className="text-xs font-medium text-(--text-gray)">Table No.</h1>
                <span className="text-xs font-semibold">
                  {
                    mappedTable.map((item) => {
                      const seatNames = item.seatReserved.map((s) => s.name).join(', ');
                      return `${item.tableElement} - ${seatNames}`;
                    }).join('; ') // separate multiple tables with semicolon
                  }
              </span>
          </div>
          <div className="w-full flex justify-between items-center mb-2">
              <h1 className="text-xs font-medium text-(--text-gray)">No. of Seats</h1>
              <span className="text-xs font-semibold">{numberOfSeats}</span>
          </div>
          <div className="w-full flex justify-between items-center mb-2">
              <h1 className="text-xs font-medium text-(--text-gray)">Reservation Date</h1>
              <span className="text-xs font-semibold">
                {selected
                  ? `${selected.from?.toLocaleDateString() || ''}${selected.to ? ' - ' + selected.to.toLocaleDateString() : ''}`
                  : 'N/A'}
              </span>
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
                    value={data[3]?.val?.toString() ?? ''} // Use Reservation ID as barcode value
                    width={1} 
                    height={50}
                    format="CODE128"
                    displayValue={false}
                    background="transparent"
                    marginTop={20}
                    marginLeft={35}
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
        
      </div>
      
        <a 
          href="/welcomeOptions" 
          className="w-full h-8 flex justify-center items-center text-xs font-semibold bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm mt-[120px]"
        >
          Return to Homepage
        </a>
      </section>
  );
}

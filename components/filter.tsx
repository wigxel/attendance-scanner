import React from 'react'
import { Dispatch, SetStateAction } from 'react';

interface FilterComponentProps{
  id: string,
  label: string,
  checker: string //unique checker for each field
  name: string
  value: SeatStatus
  onChange: Dispatch<SetStateAction<SeatStatus>>
}


export type SeatStatus = "seatAvailable" | "seatSelected" | "seatReserved";

export default function RadioFilterComponent(
  
  { id, label, checker, onChange, name, value }: FilterComponentProps) 

  {

  return (
    <label htmlFor={id} className='flex items-center text-xs font-medium mr-1'>
        <input
          type='radio'
          id={id}
          value={value}
          name={name}
          checked={checker === value}
          className='mr-0.5'
          onChange={() => onChange(value)}
        />
        {label}
    </label>
  )
}

import React from 'react'
import { Dispatch, SetStateAction } from 'react';

interface FilterComponentProps{
    id: string,
    label: string,
    filter: string
    setFilter: Dispatch<SetStateAction<string>>
}
export default function RadioFilterComponent({ id, label, filter, setFilter }: FilterComponentProps) {
  return (
    <label htmlFor={id} className='flex items-center text-xs font-medium mr-1'>
        <input
            type='radio'
            id={id}
            value={id}
            checked={filter === label}
            className='mr-0.5'
            onChange={() => setFilter(label)}
        />
        {label}
    </label>
  )
}

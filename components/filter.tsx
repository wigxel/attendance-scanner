import React from 'react'
import { Dispatch, SetStateAction } from 'react';
import { UseFormRegister } from 'react-hook-form';

interface FormData {
    filter: string;
}
interface FilterComponentProps{
    id: string,
    label: string,
    register:  UseFormRegister<FormData>,
    filter: string
    setFilter: Dispatch<SetStateAction<string>>
}
export default function RadioFilterComponent({ id, label, register, filter, setFilter }: FilterComponentProps) {
  return (
    <label htmlFor={id} className='flex items-center text-xs font-medium'>
        <input
            type='radio'
            id={id}
            value={id}
            checked={filter === label}
            {...register('filter', { required: true })}
            className='mr-1'
            onClick={() => setFilter(label)}
        />
        {label}
    </label>
  )
}

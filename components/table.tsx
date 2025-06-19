import React, { Dispatch, SetStateAction } from 'react'

interface TableComponentProps{
    id: string
    label: string
    position: string
    size: string
    table: string
    tableRotation: string
    seatOptions: string[]
    setTableSeatOptions: Dispatch<SetStateAction<string[]>>
    textRotation: string
    setTable: Dispatch<SetStateAction<string>>
    setSeat: Dispatch<SetStateAction<string[]>>
}
export default function TableComponent(
    { 
        id, label, setTable, position, 
        size = "w-[51px] h-[99px]", 
        tableRotation, textRotation, setSeat,
        table, setTableSeatOptions, seatOptions
    }: 
        TableComponentProps
    ) {
  return (
        <button
            type='button'
            onClick={() => {
                setTable(id)
                setTableSeatOptions(seatOptions)
                setSeat([])
            }}
            className={(label === table) ? `absolute ${size} ${position} cursor-pointer flex items-center justify-center bg-(--primary) text-white ${tableRotation} border hover:border-(--primary)`:
                `absolute ${size} ${position} cursor-pointer flex items-center justify-center bg-[#D9D9D9] ${tableRotation} border hover:border-(--primary)`
            }
        >
            <span className={`${textRotation} text-xs relative`}>{label}</span>
        </button>
    );
}
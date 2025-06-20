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

        const tableClasses = `absolute ${size} ${position} cursor-pointer flex items-center justify-center ${tableRotation} border hover:border-(--primary) ${(label === table) ? 'bg-(--primary) text-white' : 'bg-[#D9D9D9]'}`;
  return (
        <button
            type='button'
            onClick={() => {
                if (table === id) {
                    // Deselect if already selected
                    setTable('')
                    setTableSeatOptions([])
                    setSeat([])
                } else {
                    // Select this table
                    setTable(id)
                    setTableSeatOptions(seatOptions)
                    setSeat([])
                }
            }}
            className={tableClasses}
        >
            <span className={`${textRotation} text-xs relative`}>{label}</span>
        </button>
    );
}
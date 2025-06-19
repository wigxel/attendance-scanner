import React from 'react'

interface TableComponentProps{
    seat: string
    setSeat: Dispatch<SetStateAction<string>>
    table: string
    setTable: Dispatch<SetStateAction<string>>
    id: string
    label: string
    position: string
    size: string
    tableRotation: string
    textRotation
}
export default function TableComponent(
    { 
        id, label, onClick, position, 
        size = "w-[51px] h-[99px]", 
        tableRotation, textRotation
    }: 
        TableComponentProps
    ) {
  return (
        <button
            type='button'
            onClick={() => onClick(id)}
            className={`absolute ${size} ${position} cursor-pointer flex items-center justify-center bg-[#D9D9D9] ${tableRotation} border hover:border-(--primary)`}>
            <span className={`${textRotation} text-xs relative`}>{label}</span>
        </button>
    );
}
{/* <Table id='T1' label='T1' onClick={setTable} position='left-[calc(50%-25.5px-74px)] top-[45px]' /> */}
{/* <button 
                                type='button'
                                onClick={() => setTable('T1')}
                                className="absolute w-[51px] h-[99px] left-[calc(50%-25.5px-74px)] top-[45px] cursor-pointer flex items-center justify-center bg-[#D9D9D9] rounded-[10px] -rotate-90 border hover:border-(--primaryy)"
                            >
                                <span className='!rotate-90 text-xs relative'>
                                    T1
                                </span>
                            </button> */}
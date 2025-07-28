import React from "react";

interface TableComponentProps {
  label: string;
  position: string;
  size: string;
  table: string[];
  tableRotation: string;
  textRotation: string;
}
export default function TableComponent({
  label,
  position,
  size = "w-[51px] h-[99px]",
  tableRotation,
  textRotation,
  table,
}: TableComponentProps) {
  const tableClasses = `absolute ${size} ${position} cursor-pointer flex items-center justify-center ${tableRotation} border hover:border-(--primary) ${table.includes(label) ? "bg-(--primary) text-white" : "bg-[#D9D9D9]"}`;

  return (
    <button type="button" className={tableClasses}>
      <span className={`${textRotation} text-xs relative`}>{label}</span>
    </button>
  );
}

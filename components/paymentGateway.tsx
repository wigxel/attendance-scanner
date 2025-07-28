import { AlignLeft } from "lucide-react";
import React from "react";

export default function PaymentGatewayComponent() {
  return (
    <div className="w-[335px] sm:w-[335px] h-[812px] flex flex-col justify-center items-center">
      <div className="w-[311px] h-[237px] rounded-md border-2 border-dashed border-(--text-gray) flex flex-col justify-center items-center">
        <span>
          <AlignLeft className="w-14 h-14 text-(--primary)" />
        </span>
        <p className="text-2xl font-normal mt-6">Payment Gateway</p>
      </div>
    </div>
  );
}

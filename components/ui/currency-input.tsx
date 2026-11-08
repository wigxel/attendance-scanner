"use client";

import * as React from "react";
import { StepperInput, type StepperInputProps } from "./stepper-input";

type CurrencyInputProps = Omit<StepperInputProps, "prefix">;

export const CurrencyInput = React.forwardRef<
  HTMLInputElement,
  CurrencyInputProps
>(function CurrencyInput(props, ref) {
  return <StepperInput ref={ref} prefix="₦" {...props} />;
});

import React from "react";
import { useForm } from "react-hook-form";

export default function SignupComponent() {
  interface FormData {
    email: string;
    password: string;
  }

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = () => {};

  return (
    <div className="w-full sm:w-[335px] h-[812px] flex flex-col justify-center items-center">
      {/* header text */}
      <header className="w-full h-fit flex flex-col justify-center items-center">
        <h3 className="text-2xl">
          Hello, Curious One{" "}
          <span className="text-lg font-light">&#x1F44B;</span>
        </h3>
        <p className="w-[188px] h-8 text-center text-sm font-normal my-2">
          You need to sign up to complete your reservation
          <span className="text-sm font-light">&#128513;</span>
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-24 mb-4">
        <input
          placeholder="Enter your email"
          {...register("email", { required: true })}
          className="w-full sm:max-w[335px] h-8 text-xs border p-2 mb-4 rounded-sm"
        />

        {errors.email && (
          <span className="text-red-500 text-xs">This field is required</span>
        )}

        <input
          placeholder="Enter your password"
          {...register("password", { required: true })}
          className="w-full sm:max-w[335px] h-8 text-xs border p-2 mb-4 rounded-sm"
        />

        {errors.password && (
          <span className="text-red-500 text-xs">This field is required</span>
        )}

        <button
          type="submit"
          className="w-full h-8 text-xs font-semibold bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm"
        >
          Sign Up and Continue
        </button>
      </form>

      <div className="w-full flex justify-start items-center">
        <span className="text-sm font-normal">Already have an account? </span>
        <a
          href="#"
          className="text-sm font-normal ml-2 underline hover:text-blue-500 cursor-pointer"
        >
          Log in
        </a>
      </div>
    </div>
  );
}

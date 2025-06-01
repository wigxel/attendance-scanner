"use client";


export default function LoginOptionsComponent() {
  
  return (
    <section className="w-full h-screen flex justify-center items-center p-4 xl:p-0">

      {/* login options */}
      <div className="w-full sm:w-[335px] h-[812px] flex flex-col gap-8 justify-center items-center">
        {/* header text */}
          <header className="flex flex-col justify-center items-center">
            <h3 className="text-xl">Welcome to</h3>
            <h1 className="text-5xl font-bold my-2">INSPACE</h1>
          </header>

        {/* login options */}
        <div className="w-full h-fit mt-32">
          {/* guest button */}
          <button type="button" className="w-full h-8 text-xs font-semibold border-2 border-(--button-gray) bg-white text-black hover:bg-(--button-gray) rounded-sm mb-4">Continue as a Guest</button>
          {/* user button */}
          <button type="button" className="w-full h-8 text-xs font-semibold  bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm">Continue as a User</button>
        </div>

      </div>
    </section>
  );
}
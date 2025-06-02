"use client";

import { Minus, MoveRight } from "lucide-react";


export default function LoginLandingPageComponent() {

  const data = [
    {
      id: 1, 
      title: 'Where creativity connects',
      description: 'Flexible workspaces designed for remote creatives, freelancers and teams to collaborate, create, and thrive.', 
      cta: 'Make a Reservation'
    },
    {
      id: 2, 
      title: 'Code. Create. Launch', 
      description: 'Hands-on training in tech and digital skills-empowering the next generation of innovators and problem-solvers.', 
      cta: 'Enroll Today'
    }
  ]
  
  return (
    <section className="w-full h-screen flex justify-center items-center p-4 xl:p-0">

      {/* login options */}
      <div className="w-full sm:max-w-[335px] h-[812px] flex flex-col justify-center items-center">
        {/* header text */}
          <header className="w-full h-fit flex flex-col justify-center items-start">
            <h3 className="text-xl">Hello, Sim Fubara <span className="text-lg font-light">&#x1F44B;</span></h3>
            <h1 className="text-2xl font-semibold my-2 subpixel-antialiased">Welcome Back</h1>
          </header>

        {/* login options */}
        <div className="w-full h-fit mt-6">
          {
            data.map((item) => (
              <div
                key={item.id}
                className="w-full sm:w-[335px] h-[232px] flex flex-col justify-center rounded-lg bg-(--background-gray) px-6 py-12 mb-4"
              >
                {/* header text */}
                <h1 className="font-semibold text-base">{item.title}</h1>
                {/* description */}
                <p className="w-full text-sm font-normal tracking-wide py-4">{item.description}</p>
                {/* CTA */}
                <button
                  type="button"
                  className="w-full sm:max-w[232px] h-8 flex items-center justify-between text-xs font-semibold text-left px-4 bg-(--button-gray) text-black hover:bg-gray-300 rounded-sm mb-4"
                >
                  {item.cta}
                  <span className="flex">
                    <Minus className="-mr-2" />
                    <Minus className="-mr-2" />
                    <MoveRight />
                  </span>
                </button>
              </div>
            ))}
        </div>

      </div>
    </section>
  );
}

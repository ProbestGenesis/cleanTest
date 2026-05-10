"use client"

import { ReactNode } from "react";
import  Image from "next/image"
import bgImage from "@/assets/image/authPage/background.jpg"

type Props = {
  children: ReactNode;
};

function layout({ children }: Props) {
  return (
    <div className="w-full h-screen">
      <Image src={bgImage} fill alt="background" className="object-cover z-0" priority />
      <div className="bg-black/50 w-full h-screen absolute inset-0" />
       <div className="flex items-center justify-center h-full w-full">
        {children} 
       </div> 
    </div>
  );
}

export default layout;

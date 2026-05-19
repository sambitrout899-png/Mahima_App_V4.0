import React from "react";

export default function PastorCharacter({ className = "" }) {
  return (
    <div className={`pastor-character relative overflow-hidden rounded-full bg-gradient-to-b from-amber-100 via-emerald-50 to-slate-900 ${className}`}>
      <div className="absolute left-1/2 top-[10%] h-[22%] w-[46%] -translate-x-1/2 rounded-t-full bg-slate-950" />
      <div className="absolute left-1/2 top-[18%] h-[44%] w-[54%] -translate-x-1/2 rounded-[48%] bg-[#8f5638] shadow-[inset_0_-10px_0_rgba(80,35,22,.16)]" />
      <div className="absolute left-[32%] top-[34%] h-[5%] w-[8%] rounded-full bg-slate-950" />
      <div className="absolute right-[32%] top-[34%] h-[5%] w-[8%] rounded-full bg-slate-950" />
      <div className="absolute left-1/2 top-[42%] h-[15%] w-[32%] -translate-x-1/2 rounded-b-full border-b-[3px] border-slate-900/70" />
      <div className="absolute left-1/2 top-[49%] h-[16%] w-[40%] -translate-x-1/2 rounded-b-[45%] bg-slate-950" />
      <div className="absolute left-1/2 bottom-[7%] h-[38%] w-[82%] -translate-x-1/2 rounded-t-[46%] bg-slate-950" />
      <div className="absolute left-1/2 bottom-[19%] h-[24%] w-[34%] -translate-x-1/2 rounded-b-xl bg-white" />
      <div className="absolute left-1/2 bottom-[26%] h-[20%] w-[12%] -translate-x-1/2 rounded-b-md bg-emerald-700" />
      <div className="absolute left-[18%] bottom-[10%] h-[24%] w-[26%] rotate-[-10deg] rounded-xl bg-[#7c4a1d]" />
      <div className="absolute left-[21%] bottom-[14%] h-[18%] w-[20%] rotate-[-10deg] rounded-lg border-2 border-amber-300/80" />
      <style>{`
        .pastor-character {
          min-width: 1.5rem;
          min-height: 1.5rem;
        }
      `}</style>
    </div>
  );
}

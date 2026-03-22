import React from 'react';

function SelectPaymentType() {
    return (
        <div className="flex min-w-screen min-h-screen bg-[#f0f8ff] items-center justify-center p-6 md:p-10 font-sans">
            <div className="bg-white w-full max-w-4xl border-4 border-gray-300 rounded-[32px] p-8 md:p-12 flex flex-col items-center shadow-sm">
                
                {/* Title */}
                <h1 className="text-3xl md:text-[44px] font-black uppercase text-black mb-10 tracking-tight text-center leading-tight">
                    Select Payment Method
                </h1>

                {/* Inner Blue Container */}
                <div className="bg-[#e9f2fa] border-[3px] border-[#cdddec] rounded-[24px] p-8 md:px-12 w-full max-w-3xl flex flex-col items-center gap-6">

                    {/* Top Row: 3 Payment Cards */}
                    <div className="flex flex-col md:flex-row gap-5 justify-center w-full">

                        {/* 1. PromptPay */}
                        <button className="w-48 h-36 bg-white border-[6px] border-[#91cbf9] rounded-[20px] p-3 hover:scale-105 transition-transform duration-200 flex items-center justify-center overflow-hidden shadow-sm">
                            <img
                                src="https://miro.medium.com/v2/1*nueyBV0RNEpETYMKpsYWhA.png"
                                alt="PromptPay"
                                className="object-contain h-full w-full"
                            />
                        </button>

                        {/* 2. Credit/Debit Card */}
                        <button className="w-48 h-36 bg-[#91cbf9] border-none rounded-[20px] p-4 hover:scale-105 transition-transform duration-200 flex flex-col items-center justify-center gap-2 shadow-sm">
                            <div className="grid grid-cols-3 gap-2 w-full">
                                {/* Simulated Logo Cards for clean aesthetic without hotlinking external svgs */}
                                <div className="bg-white h-7 rounded-[4px] flex items-center justify-center">
                                    <span className="text-[10px] font-black text-blue-800">VISA</span>
                                </div>
                                <div className="bg-white h-7 rounded-[4px] flex items-center justify-center">
                                     <div className="flex gap-0.5"><div className="w-3 h-3 bg-red-500 rounded-full"></div><div className="w-3 h-3 bg-yellow-500 rounded-full -ml-1.5 opacity-90"></div></div>
                                </div>
                                <div className="bg-blue-500 h-7 rounded-[4px] flex items-center justify-center">
                                     <span className="text-[8px] font-black text-white">AMEX</span>
                                </div>
                                <div className="bg-white h-7 rounded-[4px] flex items-center justify-center">
                                     <span className="text-[8px] font-black text-red-600">UnionPay</span>
                                </div>
                                <div className="bg-white h-7 rounded-[4px] flex items-center justify-center">
                                    <span className="text-[7px] font-black text-orange-500">DISCOVER</span>
                                </div>
                                <div className="bg-white h-7 rounded-[4px] flex items-center justify-center">
                                    <span className="text-[10px] font-black text-green-700">JCB</span>
                                </div>
                            </div>
                            <span className="text-[11px] font-black text-black mt-1">CREDIT/DEBIT CARD</span>
                        </button>

                        {/* 3. Rabbit Card */}
                        <button className="w-48 h-36 bg-white border-[6px] border-[#91cbf9] rounded-[20px] p-2 hover:scale-105 transition-transform duration-200 flex items-center justify-center shadow-sm">
                            <div className="flex flex-col items-center justify-center mt-2">
                                <span className="text-[#f16622] font-black text-[28px] leading-[0.8] tracking-tighter">rabbit</span>
                                <span className="text-[#555555] font-black text-[28px] leading-tight tracking-tighter">card</span>
                            </div>
                        </button>

                    </div>

                    {/* Bottom Row: 1 Payment Card (Centered) */}
                    <div className="flex justify-center w-full">
                         {/* 4. Cash */}
                        <button className="w-48 h-36 bg-[#91cbf9] border-none rounded-[20px] hover:scale-105 transition-transform duration-200 flex flex-col items-center justify-center gap-3 shadow-sm">
                            <div className="relative w-[88px] h-14 bg-[#5cb85c] rounded-md flex items-center justify-center shadow-md">
                                <div className="w-7 h-7 bg-white rounded-full"></div>
                                {/* Corner Cutouts matching the container background */}
                                <div className="absolute -left-2 -top-2 w-4 h-4 bg-[#91cbf9] rounded-full"></div>
                                <div className="absolute -right-2 -top-2 w-4 h-4 bg-[#91cbf9] rounded-full"></div>
                                <div className="absolute -left-2 -bottom-2 w-4 h-4 bg-[#91cbf9] rounded-full"></div>
                                <div className="absolute -right-2 -bottom-2 w-4 h-4 bg-[#91cbf9] rounded-full"></div>
                            </div>
                            <span className="text-[11px] font-black text-black">CASH</span>
                        </button>
                    </div>

                </div>

                {/* Cancel Transaction Button */}
                <button className="mt-10 mb-2 bg-[#ffe6e6] text-[#ff0000] font-bold text-lg px-8 py-3 rounded-full flex items-center justify-center gap-2 hover:bg-red-200 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 stroke-[3px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    CANCEL TRANSACTION
                </button>

            </div>
        </div>
    );
}

export default SelectPaymentType;
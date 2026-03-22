type Receipt = {
  totalPrice: number;
  totalWeight: number;
};

function Receipt({ totalPrice, totalWeight }: Receipt){
    return (
        <div className="flex flex-col flex-1 w-full h-full">
            <div className="flex flex-col h-full border-b-0 bg-white p-4 border-4 border-gray-300 rounded-3xl overflow-y-auto">
                <h1 className="text-3xl md:text-5xl font-black uppercase break-words text-gray-900">Receipt</h1>
                <br />
                <hr className="bg-gray-900 h-0.5 mb-6" />
                <div className="flex flex-col">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                        <p className="text-xl lg:text-2xl">Subtotal</p>
                        <p className="text-xl lg:text-2xl font-bold">฿0.00</p>
                    </div>
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center text-red-400">
                        <p className="text-xl lg:text-2xl">Weight</p>
                        <p className="text-xl lg:text-2xl font-bold">{totalWeight.toLocaleString()} G</p>
                    </div>
                </div>
                <div>

                </div>
                <div className="mt-auto pt-6 flex flex-col mb-6">
                    <h1 className="text-3xl lg:text-5xl">Total:</h1>
                    <h1 className="text-3xl lg:text-5xl font-bold">฿{totalPrice.toLocaleString()}</h1>
                </div>
            </div>
            <hr className="h-0.5 border-t-4 border-dashed border-gray-300 " />
            <div className="bg-white p-4 border-4 border-t-0 border-gray-300 rounded-3xl">
                <div className="flex flex-col-reverse md:flex-row justify-between gap-3">
                    <button className="text-lg lg:text-2xl p-2 rounded-xl border-2 border-gray-300 text-gray-800 font-bold cursor-pointer">Back</button>
                    <button className="text-lg lg:text-2xl bg-blue-400 rounded-xl p-2 text-white font-bold cursor-pointer">Continue</button>
                </div>
            </div>
        </div>
    )
}
export default Receipt


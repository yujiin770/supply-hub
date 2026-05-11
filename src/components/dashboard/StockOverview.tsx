import React from 'react';

interface StockOverviewProps {
    hasStock: number;
    noStock: number;
    disabled: number;
}

const StockOverview: React.FC<StockOverviewProps> = ({ hasStock, noStock, disabled }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Stock Overview</h3>
            <p className="text-sm text-gray-500 mb-8">Listings breakdown by availability</p>

            <div className="grid grid-cols-3 gap-4 sm:gap-8 flex-1 content-end pb-4">
                <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-green-600 mb-3">{hasStock}</span>
                    <div className={`w-full max-w-[100px] h-32 rounded-lg ${hasStock > 0 ? 'bg-green-500' : 'bg-gray-100'}`}></div>
                    <span className="text-xs text-gray-500 mt-3 font-medium">Has Stock</span>
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-red-600 mb-3">{noStock}</span>
                    <div className={`w-full max-w-[100px] h-32 rounded-lg ${noStock > 0 ? 'bg-amber-400' : 'bg-gray-100'}`}></div>
                    <span className="text-xs text-gray-500 mt-3 font-medium">No Stock</span>
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-gray-600 mb-3">{disabled}</span>
                    <div className={`w-full max-w-[100px] h-32 rounded-lg ${disabled > 0 ? 'bg-gray-400' : 'bg-gray-100'}`}></div>
                    <span className="text-xs text-gray-500 mt-3 font-medium">Disabled</span>
                </div>
            </div>
        </div>
    );
};

export default StockOverview;
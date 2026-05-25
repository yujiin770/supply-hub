// src/components/dashboard/StockOverview.tsx
import React from 'react';
import { Package, AlertCircle, Ban } from 'lucide-react';

interface StockOverviewProps {
    hasStock: number;
    noStock: number;
    disabled: number;
}

const StockOverview: React.FC<StockOverviewProps> = ({ hasStock, noStock, disabled }) => {
    const total = hasStock + noStock + disabled;
    
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-gray-800">Stock Overview</h3>
                {total > 0 && (
                    <div className="bg-gray-100 px-2 py-1 rounded-lg">
                        <span className="text-xs font-semibold text-gray-600">Total: {total}</span>
                    </div>
                )}
            </div>
            <p className="text-sm text-gray-500 mb-6">Listings breakdown by availability</p>

            <div className="grid grid-cols-3 gap-4 sm:gap-8 flex-1 content-end pb-4">
                {/* Has Stock */}
                <div className="flex flex-col items-center group">
                    <div className="flex items-center gap-1 mb-2">
                        <Package className="w-4 h-4 text-green-600" />
                        <span className="text-lg font-bold text-green-600">{hasStock}</span>
                    </div>
                    <div className={`w-full h-32 rounded-xl transition-all duration-300 ${hasStock > 0 ? 'bg-gradient-to-b from-green-400 to-green-600 shadow-sm' : 'bg-gray-100'}`}>
                        {hasStock > 0 && (
                            <div className="w-full h-full flex items-end justify-center pb-2">
                                <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                    {hasStock} items
                                </span>
                            </div>
                        )}
                    </div>
                    <span className="text-xs font-medium text-gray-500 mt-3 group-hover:text-green-600 transition-colors">Has Stock</span>
                    {total > 0 && hasStock > 0 && (
                        <span className="text-[10px] text-gray-400 mt-1">
                            {((hasStock / total) * 100).toFixed(1)}%
                        </span>
                    )}
                </div>

                {/* No Stock */}
                <div className="flex flex-col items-center group">
                    <div className="flex items-center gap-1 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-lg font-bold text-red-600">{noStock}</span>
                    </div>
                    <div className={`w-full h-32 rounded-xl transition-all duration-300 ${noStock > 0 ? 'bg-gradient-to-b from-red-400 to-red-600 shadow-sm' : 'bg-gray-100'}`}>
                        {noStock > 0 && (
                            <div className="w-full h-full flex items-end justify-center pb-2">
                                <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                    {noStock} items
                                </span>
                            </div>
                        )}
                    </div>
                    <span className="text-xs font-medium text-gray-500 mt-3 group-hover:text-red-600 transition-colors">No Stock</span>
                    {total > 0 && noStock > 0 && (
                        <span className="text-[10px] text-gray-400 mt-1">
                            {((noStock / total) * 100).toFixed(1)}%
                        </span>
                    )}
                </div>

                {/* Disabled */}
                <div className="flex flex-col items-center group">
                    <div className="flex items-center gap-1 mb-2">
                        <Ban className="w-4 h-4 text-gray-600" />
                        <span className="text-lg font-bold text-gray-600">{disabled}</span>
                    </div>
                    <div className={`w-full h-32 rounded-xl transition-all duration-300 ${disabled > 0 ? 'bg-gradient-to-b from-gray-400 to-gray-600 shadow-sm' : 'bg-gray-100'}`}>
                        {disabled > 0 && (
                            <div className="w-full h-full flex items-end justify-center pb-2">
                                <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                    {disabled} items
                                </span>
                            </div>
                        )}
                    </div>
                    <span className="text-xs font-medium text-gray-500 mt-3 group-hover:text-gray-700 transition-colors">Disabled</span>
                    {total > 0 && disabled > 0 && (
                        <span className="text-[10px] text-gray-400 mt-1">
                            {((disabled / total) * 100).toFixed(1)}%
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StockOverview;
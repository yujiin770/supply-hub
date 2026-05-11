import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TopItemsProps {
    type: 'fast' | 'slow';
    items: Array<{ name: string; category: string; orders: number; orderCount: number }>;
}

const TopItems: React.FC<TopItemsProps> = ({ type, items }) => {
    const isFast = type === 'fast';

    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 p-6 h-full min-h-[200px]">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isFast ? 'bg-[#F0FAFB] text-[#21BBD7]' : 'bg-orange-50 text-orange-500'}`}>
                        {isFast ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">
                        {isFast ? 'Fast-Moving Items' : 'Slow-Moving Items'}
                    </h3>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="h-32 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
                    <p className="text-gray-400 text-sm font-medium">
                        Not enough data available
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-[#004797] text-white' : 'bg-gray-100 text-gray-500'}`}>
                                {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-gray-800 truncate">{item.name}</div>
                                <div className="text-xs text-gray-400 font-medium truncate">{item.category}</div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2">
                                    <div className={`h-full rounded-full bg-gradient-to-r ${isFast ? 'from-[#21BBD7] to-[#004797]' : 'from-orange-400 to-red-500'}`} style={{ width: '100%' }}></div>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-lg font-extrabold text-[#004797] leading-none">{item.orders}</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">Orders</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TopItems;
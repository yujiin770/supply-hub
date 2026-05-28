import React from 'react';

interface LoadingSkeletonProps {
  type: 'status' | 'summary' | 'chart' | 'list';
  count?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ type, count = 1 }) => {
  const skeletons = Array(count).fill(0);

  const renderSkeleton = () => {
    switch (type) {
      case 'status': // Matches the 7 small top cards
        return (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] h-32 flex flex-col justify-between">
            <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse" />
            <div className="mt-2 space-y-2">
              <div className="h-6 bg-gray-100 rounded-md w-12 animate-pulse" />
              <div className="h-3 bg-gray-100 rounded-md w-20 animate-pulse" />
            </div>
          </div>
        );

      case 'summary': // Matches the 4 middle summary cards
        return (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] h-[124px]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 rounded-full bg-gray-100 animate-pulse" />
              <div className="h-3 bg-gray-100 rounded-md w-24 animate-pulse" />
            </div>
            <div className="h-8 bg-gray-100 rounded-md w-16 animate-pulse" />
            <div className="mt-3 h-3 bg-gray-100 rounded-md w-28 animate-pulse" />
          </div>
        );

      case 'chart': // Matches the Orders By Status / Stock Overview
        return (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] h-full min-h-[300px] flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div className="h-5 bg-gray-100 rounded-md w-40 animate-pulse" />
              <div className="h-6 bg-gray-100 rounded-lg w-20 animate-pulse" />
            </div>
            <div className="space-y-6 flex-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 bg-gray-100 rounded-md w-32 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded-full flex-1 animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded-md w-8 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        );

      case 'list': // Matches Fast/Slow Moving Items
        return (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] h-full min-h-[250px]">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse" />
              <div className="h-5 bg-gray-100 rounded-md w-40 animate-pulse" />
            </div>
            <div className="space-y-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 items-center">
                  <div className="w-6 h-6 rounded-full bg-gray-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded-md w-3/4 animate-pulse" />
                    <div className="h-3 bg-gray-100 rounded-md w-1/2 animate-pulse" />
                  </div>
                  <div className="h-6 bg-gray-100 rounded-md w-10 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  if (count === 1) return renderSkeleton();

  return (
    <>
      {skeletons.map((_, idx) => (
        <React.Fragment key={idx}>{renderSkeleton()}</React.Fragment>
      ))}
    </>
  );
};

export default LoadingSkeleton;
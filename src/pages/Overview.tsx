import React from 'react';
import { Check, PartyPopper } from 'lucide-react';

const OnboardingOverview: React.FC = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-10 px-4">
      <div className="w-full max-w-4xl mx-auto">
        
        {/* --- Centered Header Section --- */}
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100 uppercase tracking-[0.2em] mb-4">
            Status: Approved
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">Onboarding</h1>
          <p className="text-lg text-gray-400 font-bold mt-2">John Canas</p>
        </div>

        {/* --- Stepper Card --- */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 sm:p-16 shadow-sm mb-8">
          <div className="relative flex flex-col sm:flex-row justify-between items-center gap-12 sm:gap-0">
            
            {/* Connecting Line (Desktop) */}
            <div className="hidden sm:block absolute top-6 left-0 right-0 h-1 bg-emerald-500 rounded-full z-0 mx-20"></div>

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center text-center sm:w-1/3 group">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-200 transition-transform group-hover:scale-110">
                <Check className="w-6 h-6 stroke-[3px]" />
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">Account Created</h3>
                <p className="text-[11px] text-gray-400 font-bold mt-1 uppercase tracking-wider">Signup complete</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center text-center sm:w-1/3 group">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-200 transition-transform group-hover:scale-110">
                <Check className="w-6 h-6 stroke-[3px]" />
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">KYC Submitted</h3>
                <p className="text-[11px] text-gray-400 font-bold mt-1 uppercase tracking-wider">Documents uploaded</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center text-center sm:w-1/3 group">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-200 transition-transform group-hover:scale-110">
                <Check className="w-6 h-6 stroke-[3px]" />
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">Approved</h3>
                <p className="text-[11px] text-gray-400 font-bold mt-1 uppercase tracking-wider">Review passed</p>
              </div>
            </div>
            
          </div>
        </div>

        {/* --- Success Alert --- */}
        <div className="w-full bg-white p-2 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="bg-emerald-50/40 border border-emerald-100 rounded-[1.5rem] p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
               <PartyPopper className="w-7 h-7 text-emerald-500" />
            </div>
            <div>
              <h4 className="text-xl font-extrabold text-emerald-900">Account approved!</h4>
              <p className="text-sm text-emerald-700/70 font-bold mt-1 leading-relaxed">
                Your supplier account is fully activated. You can now access Catalogs and start managing your Orders.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OnboardingOverview;
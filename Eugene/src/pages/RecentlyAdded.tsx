import React, { useState } from "react";
import {
  Clock,
  Calendar,
  ChevronRight,
  MoreHorizontal,
  Eye
} from "lucide-react";

interface RecentlyAddedItem {
  id: string;
  name: string;
  strength: string;
  form: string;
  route: string;
  basePrice: number | null;
  stock: string | number;
  status: "Active" | "Disabled" | "Pending";
  addedAt: string;
}

const MOCK_DATA: RecentlyAddedItem[] = [
  { id: "1", name: "Bisoprolol", strength: "5 mg / 1 pack", form: "Tablet", route: "Oral", basePrice: null, stock: "∞", status: "Disabled", addedAt: "5/25/2026, 6:14:12 PM" },
  { id: "2", name: "Biogesic bbbb", strength: "12 mol", form: "Lotion", route: "Sublingual", basePrice: null, stock: "∞", status: "Disabled", addedAt: "5/25/2026, 6:14:12 PM" },
  { id: "3", name: "Biogesic aaa", strength: "1221 mmol", form: "Lotion", route: "Transdermal", basePrice: null, stock: "∞", status: "Disabled", addedAt: "5/25/2026, 6:14:12 PM" },
  { id: "4", name: "Biogesic 500mg", strength: "—", form: "Tablet", route: "Oral", basePrice: null, stock: "∞", status: "Disabled", addedAt: "5/25/2026, 6:14:11 PM" },
  { id: "5", name: "Biogesic 2", strength: "500 mg", form: "Tablet", route: "Oral", basePrice: null, stock: "∞", status: "Disabled", addedAt: "5/25/2026, 6:14:11 PM" },
  { id: "6", name: "Biogesic 123", strength: "500 mg", form: "Tablet", route: "Oral", basePrice: null, stock: "∞", status: "Disabled", addedAt: "5/25/2026, 6:14:11 PM" },
  { id: "7", name: "Biogesic", strength: "500 mg", form: "Tablet", route: "Oral", basePrice: null, stock: "∞", status: "Disabled", addedAt: "5/25/2026, 6:14:11 PM" },
  { id: "8", name: "Azithromycin-6", strength: "500 mg / 1 pack", form: "Capsule", route: "Oral", basePrice: null, stock: "∞", status: "Disabled", addedAt: "5/25/2026, 6:14:11 PM" },
  { id: "9", name: "Augmentin 625mg", strength: "—", form: "Tablet", route: "Oral", basePrice: null, stock: "∞", status: "Disabled", addedAt: "5/25/2026, 6:14:11 PM" },
  { id: "10", name: "Augmentin", strength: "125 mg / 500 mg", form: "Tablet", route: "Oral", basePrice: null, stock: "∞", status: "Disabled", addedAt: "5/25/2026, 6:14:11 PM" },
];

const RecentlyAdded: React.FC = () => {
  const [timeframe, setTimeframe] = useState("7d");

  return (
    <div className="pb-20 max-w-8xl mx-auto animate-in fade-in duration-500">
      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-3">
            <Clock className="w-4 h-4" />
            Inventory Audit
          </div>
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
            Recently Added Items
          </h1>
          <p className="text-gray-500 font-medium mt-2">
            Items you recently added to your catalog for pharmacy review.
          </p>
        </div>

        {/* Segmented Control for Timeframe */}
        <div className="bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-1">
          {[
            { label: "Last 7 days", value: "7d" },
            { label: "14d", value: "14d" },
            { label: "30d", value: "30d" },
            { label: "Last 90 days", value: "90d" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTimeframe(opt.value)}
              className={`
                px-5 py-2 text-xs font-bold rounded-xl transition-all duration-200
                ${timeframe === opt.value
                  ? "bg-[#004797] text-white shadow-md shadow-blue-500/20"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- Items Count Summary --- */}
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
        <span className="text-sm font-bold text-gray-900">
          49 items <span className="text-gray-400 font-medium">added in the last 7 days</span>
        </span>
      </div>

      {/* --- Main Table Card --- */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-250">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product / Strength</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Form / Route</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Base Price</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stock</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Added At</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_DATA.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-gray-400 font-bold uppercase mt-1">
                      {item.strength}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm font-bold text-gray-700">{item.form}</div>
                    <div className="text-[11px] text-gray-300 font-medium mt-1">{item.route}</div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-bold text-gray-300">—</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xl font-medium text-gray-300">{item.stock}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`
                      px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border
                      ${item.status === 'Disabled'
                        ? 'bg-gray-50 text-gray-400 border-gray-100'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'}
                    `}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {item.addedAt}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- Footer Pagination --- */}
        <div className="px-8 py-5 bg-gray-50/30 border-t border-gray-50 flex items-center justify-between">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Showing <span className="text-gray-900">10</span> of 49 total records
          </p>
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-lg border border-gray-200 bg-white text-gray-400 disabled:opacity-50">
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <button className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default RecentlyAdded;
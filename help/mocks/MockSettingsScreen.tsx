import React from 'react';

export default function MockSettingsScreen() {
  return (
    <div className="absolute inset-0 p-2 sm:p-3 bg-gradient-to-br from-slate-100 via-white to-cyan-50">
      <div className="h-full rounded-lg border border-slate-200 bg-white/95 shadow-inner p-2 sm:p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="w-28 h-3 rounded bg-slate-300" />
          <div className="w-10 h-3 rounded bg-gray-200" />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-2 space-y-2">
          <span className="h-2.5 w-20 rounded bg-gray-300 block" />
          <div className="h-8 rounded-lg border border-gray-200 bg-gray-50" />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-2 space-y-2">
          <span className="h-2.5 w-16 rounded bg-gray-300 block" />
          <div className="h-8 rounded-lg border border-gray-200 bg-gray-50" />
        </div>

        <div className="mt-auto h-9 rounded-xl bg-blue-600" />
      </div>
    </div>
  );
}

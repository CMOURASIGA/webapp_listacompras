import React from 'react';

export default function MockListScreen() {
  return (
    <div className="absolute inset-0 p-2 sm:p-3 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="h-full rounded-lg border border-blue-100 bg-white/95 shadow-inner p-2 sm:p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="w-24 h-3 rounded bg-blue-200" />
          <div className="w-16 h-3 rounded bg-gray-200" />
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="h-8 rounded-lg border border-gray-200 bg-white" />
          <div className="h-8 w-20 rounded-lg bg-blue-600" />
        </div>

        <div className="space-y-1.5 mt-1">
          {[1, 2, 3].map((row) => (
            <div key={row} className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2 flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-blue-200 bg-white" />
              <span className="h-2.5 rounded bg-gray-200 flex-1" />
              <span className="h-2.5 w-10 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

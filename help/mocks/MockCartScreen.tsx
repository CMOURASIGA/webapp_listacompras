import React from 'react';

export default function MockCartScreen() {
  return (
    <div className="absolute inset-0 p-2 sm:p-3 bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <div className="h-full rounded-lg border border-emerald-100 bg-white/95 shadow-inner p-2 sm:p-3 flex flex-col gap-2">
        <div className="h-10 rounded-xl bg-emerald-600/90 px-3 py-2 flex items-center justify-between">
          <span className="h-2.5 w-20 rounded bg-white/70" />
          <span className="h-2.5 w-14 rounded bg-white/70" />
        </div>

        <div className="space-y-1.5 mt-1">
          {[1, 2].map((row) => (
            <div key={row} className="h-9 rounded-lg border border-gray-200 bg-white px-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-500 border border-emerald-600" />
              <span className="h-2.5 rounded bg-gray-200 flex-1" />
              <span className="h-2.5 w-12 rounded bg-gray-200" />
            </div>
          ))}
        </div>

        <div className="mt-auto h-9 rounded-xl bg-emerald-600" />
      </div>
    </div>
  );
}

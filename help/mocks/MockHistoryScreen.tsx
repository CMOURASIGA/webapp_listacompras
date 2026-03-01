import React from 'react';

export default function MockHistoryScreen() {
  return (
    <div className="absolute inset-0 p-2 sm:p-3 bg-gradient-to-br from-violet-50 via-white to-purple-50">
      <div className="h-full rounded-lg border border-purple-100 bg-white/95 shadow-inner p-2 sm:p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="w-24 h-3 rounded bg-purple-200" />
          <div className="w-14 h-3 rounded bg-gray-200" />
        </div>

        <div className="space-y-1.5">
          {[1, 2].map((card) => (
            <div key={card} className="rounded-lg border border-gray-200 bg-white p-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="h-2.5 w-20 rounded bg-gray-200" />
                <span className="h-2.5 w-12 rounded bg-purple-200" />
              </div>
              <div className="h-2 rounded bg-gray-100" />
              <div className="h-2 rounded bg-gray-100 w-5/6" />
              <div className="h-7 rounded-lg bg-purple-600/90 ml-auto w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

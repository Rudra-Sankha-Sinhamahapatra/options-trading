'use client';

import Orders from '@/components/Markets/Orders';

export default function OrdersPage() {
  return (
    <main className="min-h-screen bg-black p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Trade History</h1>
          <p className="text-gray-400">View all your trading activity and order history</p>
        </div>
        
        <Orders showHeader={false} className="min-h-[600px]" />
      </div>
    </main>
  );
}
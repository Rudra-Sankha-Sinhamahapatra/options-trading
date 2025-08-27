import CandlestickChart from '@/components/Chart/ChartPage';

export default function ChartsPage() {
  return (
    <main className="min-h-screen bg-zinc-900 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Live Charts</h1>
          <p className="text-gray-400">Real-time cryptocurrency price charts</p>
        </div>
        
        <CandlestickChart />
      </div>
    </main>
  );
}
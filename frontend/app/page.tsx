import CandlestickChart from '../components/ChartPage';

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Options Trading Dashboard</h1>
        
        <div className="space-y-8">
          <CandlestickChart width={1000} height={500} />
        </div>
      </div>
    </main>
  );
}
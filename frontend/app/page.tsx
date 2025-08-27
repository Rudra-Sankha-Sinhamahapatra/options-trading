import Link from 'next/link';
import { TrendingUp, BarChart3, Store } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-900">
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6">
              Advanced Trading
              <span className="text-blue-500 block">Platform</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Trade cryptocurrencies with real-time charts, advanced analytics, and secure order execution.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/markets"
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Start Trading
              </Link>
              <Link
                href="/charts"
                className="px-8 py-3 border border-zinc-600 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
              >
                View Charts
              </Link>
            </div>
          </div>
        </div>
      </div>


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <Link href="/charts" className="group">
            <div className="bg-zinc-800 p-6 rounded-lg hover:bg-zinc-700 transition-colors">
              <BarChart3 className="h-12 w-12 text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Live Charts</h3>
              <p className="text-gray-400">Real-time cryptocurrency price charts with advanced indicators.</p>
            </div>
          </Link>
          
          <Link href="/markets" className="group">
            <div className="bg-zinc-800 p-6 rounded-lg hover:bg-zinc-700 transition-colors">
              <Store className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Markets</h3>
              <p className="text-gray-400">Trade cryptocurrencies with competitive spreads and deep liquidity.</p>
            </div>
          </Link>
          
          <div className="bg-zinc-800 p-6 rounded-lg">
            <TrendingUp className="h-12 w-12 text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Analytics</h3>
            <p className="text-gray-400">Advanced trading analytics and portfolio management tools.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
import { useState } from "react";
import Cookies from "js-cookie";
import { UserBalance } from "@/types/market";

export function LeverageForm({
    prices,
    balance,
    BACKEND_URL,
}: {
    prices: any;
    balance: UserBalance | null;
    BACKEND_URL: string;
}) {
    const [form, setForm] = useState({
        asset: "",
        type: "buy",
        margin: 0,
        leverage: 1,
        stopLoss: "",
        takeProfit: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submitLeverage = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = Cookies.get("token");
            const response = await fetch(`${BACKEND_URL}/api/v1/trade/open`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });
            const result = await response.json();

            if (response.ok) {
                alert(`Leverage trade opened (id: ${result.orderId})`);
                setForm({
                    asset: "",
                    type: "buy",
                    margin: 0,
                    leverage: 1,
                    stopLoss: "",
                    takeProfit: "",
                });
            } else {
                setError(result.message || "Failed to open trade");
            }
        } catch (err) {
            console.error(err);
            setError("Network error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={submitLeverage} className="space-y-4">
            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div>
                <label className="text-sm text-gray-300">Asset</label>
                <select
                    value={form.asset}
                    onChange={(e) => setForm({ ...form, asset: e.target.value })}
                    className="w-full bg-zinc-700 text-white p-2 rounded"
                >
                    <option value="">Select...</option>
                    {["BTCUSDC", "ETHUSDC", "SOLUSDC"].map((a) => (
                        <option key={a} value={a.replace("USDC", "").toLowerCase()}>
                            {a}
                        </option>
                    ))}
                </select>
            </div>

            {balance && (
                <div className="text-gray-400 text-sm">
                    Available USDC:{" "}
                    {(
                        Number(balance.usdc.qty) / Math.pow(10, balance.usdc.decimals)
                    ).toFixed(2)}
                </div>
            )}

            <div>
                <label className="text-sm text-gray-300">Type</label>
                <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full bg-zinc-700 text-white p-2 rounded"
                >
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                </select>
            </div>

            {form.type && prices[form.asset.toUpperCase() + "USDC"] && (
                <div
                    className={`${form.type === "buy" ? "text-green-400" : "text-red-400"} text-sm`}
                >
                    {form.type === "buy" ? "Buy Price" : "Sell Price"}: $
                    {form.type === "buy"
                        ? prices[form.asset.toUpperCase() + "USDC"].ask?.toFixed(2)
                        : prices[form.asset.toUpperCase() + "USDC"].bid?.toFixed(2)}
                </div>
            )}


            <div>
                <label className="text-sm text-gray-300">Margin (USDC)</label>
                <input
                    type="number"
                    value={form.margin}
                    onChange={(e) =>
                        setForm({ ...form, margin: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-700 text-white p-2 rounded"
                    placeholder="Enter margin"
                />
            </div>

            <div>
                <label className="text-sm text-gray-300">Leverage</label>
                <input
                    type="number"
                    value={form.leverage}
                    min={1}
                    max={100}
                    onChange={(e) =>
                        setForm({ ...form, leverage: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-700 text-white p-2 rounded"
                />
            </div>

            <div>
                <label className="text-sm text-gray-300">Stop Loss (USD)</label>
                <input
                    type="number"
                    value={form.stopLoss}
                    onChange={(e) => setForm({ ...form, stopLoss: e.target.value })}
                    className="w-full bg-zinc-700 text-white p-2 rounded"
                    placeholder="Optional"
                />
            </div>

            <div>
                <label className="text-sm text-gray-300">Take Profit (USD)</label>
                <input
                    type="number"
                    value={form.takeProfit}
                    onChange={(e) =>
                        setForm({ ...form, takeProfit: e.target.value })
                    }
                    className="w-full bg-zinc-700 text-white p-2 rounded"
                    placeholder="Optional"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
            >
                {loading ? "Placing..." : "Open Leverage Trade"}
            </button>
        </form>
    );
}

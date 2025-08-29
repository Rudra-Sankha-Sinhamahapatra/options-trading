interface TokenBalance {
    qty: bigint;
    decimals: number;
}

interface UserBalance {
    userId: string;
    usdc: TokenBalance;
    btc: TokenBalance;
    eth: TokenBalance;
    sol: TokenBalance;
}

const toScaledInt = (value: number, decimals: number): bigint =>
  BigInt(Math.round(value * Math.pow(10, decimals)));


const userBalances = new Map<string, UserBalance>();

export function initializeUserBalance(userId: string): UserBalance {
    const defaultBalance: UserBalance = {
        userId,
        usdc: { qty: BigInt(500000), decimals: 2 }, // $5000
        btc: { qty: BigInt(0), decimals: 8 },
        eth: { qty: BigInt(0), decimals: 8 },
        sol: { qty: BigInt(0), decimals: 8 },
    };

    userBalances.set(userId, defaultBalance);
    console.log("Initialized balance of user ", userId);
    return defaultBalance;
}

export function getUserBalance(userId: string): UserBalance {
    let balance = userBalances.get(userId);
    if (!balance) {
        balance = initializeUserBalance(userId);
    }
    return balance;
}

export function updateAssetBalance(
    userId: string,
    asset: 'usdc' | 'btc' | 'eth' | 'sol',
    qty: number,
    type?: 'buy' | 'sell'
): UserBalance {
    const balance = getUserBalance(userId);

    const decimals = balance[asset].decimals;
    balance[asset].qty = toScaledInt(qty, decimals);

    userBalances.set(userId, balance);
    console.log(`📊 Updated ${asset} balance for user ${userId}: ${qty} (${type || 'N/A'})`);
    return balance;
}

export function executeTrade(
    userId: string,
    asset: 'btc' | 'eth' | 'sol',
    tradeType: 'buy' | 'sell',
    assetQty: number,
    usdcAmount: number
): { success: boolean; balance?: UserBalance; error?: string } {
    const balance = getUserBalance(userId);

    try {
        const assetDecimals = balance[asset].decimals;
        const usdcDecimals = balance.usdc.decimals;

        const assetQtyInt = toScaledInt(assetQty,assetDecimals);
        const usdcAmountInt = toScaledInt(usdcAmount,usdcDecimals);

        if (tradeType === 'buy') {
            if(balance.usdc.qty < usdcAmount) {
                return { success: false, error: `Insufficient USDC balance` };
            }
            balance.usdc.qty -= usdcAmountInt;
            balance[asset].qty += assetQtyInt
        } else {
            if(balance[asset].qty < assetQtyInt) {
                 return { success: false, error: `Insufficient ${asset.toUpperCase()} balance` };
            }
            balance[asset].qty -= assetQtyInt;
            balance.usdc.qty += usdcAmountInt;
        }

        userBalances.set(userId,balance);
        console.log(`Trade executed: ${tradeType} ${assetQty} ${asset.toUpperCase()} for ${usdcAmount} USDC`);
        return { success: true, balance };
    } catch (error) {
        return {
            success: false,
            error: `Trade execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

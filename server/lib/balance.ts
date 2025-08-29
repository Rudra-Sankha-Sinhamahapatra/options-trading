interface AssetBalance {
    qty: number;
    type: 'buy' | 'sell';
}

interface UserBalance {
    userId: string;
    usdc: { qty: number };
    btc: AssetBalance;
    eth: AssetBalance;
    sol: AssetBalance;
}

const userBalances = new Map<string, UserBalance>();

export function initializeUserBalance(userId: string): UserBalance {
    const defaultBalance: UserBalance = {
        userId,
        usdc: { qty: 5000 },
        btc: { qty: 0, type: 'buy' },
        eth: { qty: 0, type: 'buy' },
        sol: { qty: 0, type: 'buy' },
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

    if (asset === 'usdc') {
        balance.usdc.qty = qty;
    } else {
        balance[asset] = { qty, type: type || 'buy' };
    }

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
        if (tradeType === 'buy') {
            if (balance.usdc.qty < usdcAmount) {
                return {
                    success: false,
                    error: `Insufficient USDC balance. Required: ${usdcAmount}, Available: ${balance.usdc.qty}`
                };
            }

            balance.usdc.qty -= usdcAmount;
            balance[asset].qty += assetQty;
            balance[asset].type = 'buy'
        } else {
            if (balance[asset].qty < assetQty) {
                return {
                    success: false,
                    error: `Insufficient ${asset.toUpperCase()} balance. Required: ${assetQty}, Available: ${balance[asset].qty}`
                };
            }

            balance[asset].qty -= assetQty;
            balance.usdc.qty += usdcAmount;
            balance[asset].type = 'sell';
        }

        userBalances.set(userId, balance);
        console.log(`Trade executed for user ${userId}: ${tradeType} ${assetQty} ${asset.toUpperCase()} for ${usdcAmount} USDC`);
        return { success: true, balance };
    } catch (error) {
        return {
            success: false,
            error: `Trade execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

/**
 * Swap Tool - Uniswap V3
 * Chains: Ethereum Sepolia, Base Sepolia
 */

import { ethers } from 'ethers';
import { getNetwork } from '../../config/networks.js';
import { UNISWAP_QUOTER_ABI, UNISWAP_ROUTER_ABI, ERC20_ABI } from '../../config/contracts.js';
import { getEthersWallet } from '../../utils/wallet.js';

class SwapTool {
  constructor() {
    this.providers = {
      ethereum: new ethers.providers.JsonRpcProvider(getNetwork('ethereum').rpcUrl),
      base: new ethers.providers.JsonRpcProvider(getNetwork('base').rpcUrl)
    };
  }

  getChainConfig(chain) {
    const network = getNetwork(chain);
    const provider = this.providers[chain];

    return {
      network,
      provider,
      quoter: new ethers.Contract(network.contracts.uniswapQuoter, UNISWAP_QUOTER_ABI, provider),
      router: network.contracts.uniswapRouter,
      weth: network.contracts.weth,
      usdc: network.contracts.usdc
    };
  }

  resolveToken(chain, token) {
    const network = getNetwork(chain);
    const aliases = {
      'ETH': network.contracts.weth,
      'WETH': network.contracts.weth,
      'USDC': network.contracts.usdc
    };
    return aliases[token.toUpperCase()] || token;
  }

  async getTokenDecimals(provider, tokenAddress, tokenSymbol) {
    if (tokenSymbol === 'ETH' || tokenSymbol === 'WETH') {
      return 18;
    }

    try {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      return await contract.decimals();
    } catch (error) {
      console.warn(`[Swap] Failed to get decimals for ${tokenSymbol}, using 18 as default`);
      return 18;
    }
  }

  async quote(chain, tokenIn, tokenOut, amount) {
    const config = this.getChainConfig(chain);

    const tokenInAddress = this.resolveToken(chain, tokenIn);
    const tokenOutAddress = this.resolveToken(chain, tokenOut);

    const tokenInDecimals = await this.getTokenDecimals(config.provider, tokenInAddress, tokenIn);
    const tokenOutDecimals = await this.getTokenDecimals(config.provider, tokenOutAddress, tokenOut);

    const amountInParsed = ethers.utils.parseUnits(amount, tokenInDecimals);

    const feeTiers = [100, 500, 3000, 10000];
    const feeLabels = { 100: '0.01%', 500: '0.05%', 3000: '0.3%', 10000: '1%' };

    const gasPrice = await config.provider.getGasPrice();

    const quotePromises = feeTiers.map(async (fee) => {
      try {
        const result = await config.quoter.callStatic.quoteExactInputSingle({
          tokenIn: tokenInAddress,
          tokenOut: tokenOutAddress,
          amountIn: amountInParsed,
          fee,
          sqrtPriceLimitX96: 0
        });

        const amountOut = result.amountOut || result[0];
        const gasEstimate = result.gasEstimate || result[3] || 150000;

        return {
          fee,
          feeLabel: feeLabels[fee],
          amountOut: ethers.utils.formatUnits(amountOut, tokenOutDecimals),
          gasEstimate: gasEstimate.toString(),
          success: true
        };
      } catch (error) {
        return { fee, feeLabel: feeLabels[fee], success: false, error: error.message };
      }
    });

    const poolResults = await Promise.all(quotePromises);
    const successfulPools = poolResults.filter(p => p.success);

    if (successfulPools.length === 0) {
      return { chain, error: 'No liquidity pools available' };
    }

    const bestPool = successfulPools.reduce((best, current) =>
      parseFloat(current.amountOut) > parseFloat(best.amountOut) ? current : best
    );

    const gasFeeWei = gasPrice.mul(parseInt(bestPool.gasEstimate));

    return {
      chain,
      tokenIn,
      tokenOut,
      amountIn: amount,
      amountOut: bestPool.amountOut,
      rate: (parseFloat(bestPool.amountOut) / parseFloat(amount)).toFixed(6),
      gasFee: ethers.utils.formatEther(gasFeeWei),
      poolFee: bestPool.fee,
      bestPool: { fee: bestPool.fee, feeLabel: bestPool.feeLabel },
      allPools: poolResults
    };
  }

  async compare(tokenIn, tokenOut, amount) {
    const [ethereumQuote, baseQuote] = await Promise.all([
      this.quote('ethereum', tokenIn, tokenOut, amount),
      this.quote('base', tokenIn, tokenOut, amount)
    ]);

    let recommendation = null;
    if (!ethereumQuote.error && !baseQuote.error) {
      const ethNet = parseFloat(ethereumQuote.amountOut) - parseFloat(ethereumQuote.gasFee) * 2000;
      const baseNet = parseFloat(baseQuote.amountOut) - parseFloat(baseQuote.gasFee) * 2000;
      recommendation = ethNet > baseNet ? 'ethereum' : 'base';
    }

    return {
      ethereum: ethereumQuote,
      base: baseQuote,
      recommendation,
      reason: recommendation === 'base' ? 'Base has lower gas fees' : 'Ethereum has better rate'
    };
  }

  async execute(chain, tokenIn, tokenOut, amountIn, slippage = 0.5) {
    const config = this.getChainConfig(chain);
    const wallet = getEthersWallet(chain, config.provider);

    const tokenInAddress = this.resolveToken(chain, tokenIn);
    const tokenOutAddress = this.resolveToken(chain, tokenOut);

    const quoteResult = await this.quote(chain, tokenIn, tokenOut, amountIn);
    if (quoteResult.error) {
      throw new Error(quoteResult.error);
    }

    const tokenInDecimals = await this.getTokenDecimals(config.provider, tokenInAddress, tokenIn);
    const tokenOutDecimals = await this.getTokenDecimals(config.provider, tokenOutAddress, tokenOut);
    const amountOutMin = ethers.utils.parseUnits(
      (parseFloat(quoteResult.amountOut) * (1 - slippage / 100)).toFixed(tokenOutDecimals),
      tokenOutDecimals
    );

    const router = new ethers.Contract(config.router, UNISWAP_ROUTER_ABI, wallet);

    const params = {
      tokenIn: tokenInAddress,
      tokenOut: tokenOutAddress,
      fee: quoteResult.poolFee,
      recipient: wallet.address,
      amountIn: ethers.utils.parseUnits(amountIn, tokenInDecimals),
      amountOutMinimum: amountOutMin,
      sqrtPriceLimitX96: 0
    };

    const txOptions = tokenIn === 'ETH' ?
      { value: ethers.utils.parseEther(amountIn) } : {};

    if (tokenIn !== 'ETH') {
      await this.approveToken(wallet, tokenInAddress, config.router, amountIn);
    }

    const tx = await router.exactInputSingle(params, txOptions);
    const receipt = await tx.wait();

    let actualAmountOut = quoteResult.amountOut;
    const transferTopic = ethers.utils.id('Transfer(address,address,uint256)');
    const walletAddressPadded = ethers.utils.hexZeroPad(wallet.address.toLowerCase(), 32);

    for (const log of receipt.logs) {
      if (log.topics[0] === transferTopic &&
          log.topics[2]?.toLowerCase() === walletAddressPadded.toLowerCase()) {
        const amount = ethers.BigNumber.from(log.data);
        actualAmountOut = ethers.utils.formatUnits(amount, tokenOutDecimals);
        break;
      }
    }

    const explorerUrl = chain === 'ethereum'
      ? `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`
      : `https://sepolia.basescan.org/tx/${receipt.transactionHash}`;

    return {
      chain,
      txHash: receipt.transactionHash,
      explorerUrl,
      status: receipt.status === 1 ? 'success' : 'failed',
      amountIn,
      amountOut: actualAmountOut,
      expectedAmountOut: quoteResult.amountOut,
      poolUsed: quoteResult.bestPool.feeLabel,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async approveToken(wallet, tokenAddress, routerAddress, amount) {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    const decimals = await contract.decimals();
    const amountParsed = ethers.utils.parseUnits(amount, decimals);

    const currentAllowance = await contract.allowance(wallet.address, routerAddress);
    if (currentAllowance.lt(amountParsed)) {
      const tx = await contract.approve(routerAddress, ethers.constants.MaxUint256);
      await tx.wait();
    }
  }
}

export default new SwapTool();

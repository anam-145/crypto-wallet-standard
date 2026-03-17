/**
 * Wallet Utility - Mnemonic to Address/PrivateKey Derivation
 *
 * Ethereum/Base: ethers.js HDNode (BIP44: m/44'/60'/0'/0/0)
 */

import { ethers } from 'ethers';

/**
 * Derive Ethereum/Base wallet from mnemonic
 * @param {string} mnemonic - 12 or 24 word mnemonic phrase
 * @param {number} index - Account index (default: 0)
 * @returns {Object} { address, privateKey, hdPath }
 */
export function deriveEthereumWallet(mnemonic, index = 0) {
  if (!mnemonic) {
    throw new Error('Mnemonic is required');
  }

  const hdPath = `m/44'/60'/0'/0/${index}`;
  const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic.trim());
  const derivedWallet = hdNode.derivePath(hdPath);

  return {
    address: derivedWallet.address,
    privateKey: derivedWallet.privateKey,
    hdPath
  };
}

/**
 * Get all wallet addresses from environment mnemonics
 * @returns {Object} { ethereum, base }
 */
export function getWalletAddresses() {
  const mnemonic = process.env.MNEMONIC;

  const result = {
    ethereum: null,
    base: null
  };

  if (mnemonic) {
    try {
      const ethWallet = deriveEthereumWallet(mnemonic);
      result.ethereum = {
        address: ethWallet.address,
        hdPath: ethWallet.hdPath
      };
      result.base = {
        address: ethWallet.address,
        hdPath: ethWallet.hdPath
      };
    } catch (error) {
      console.error('[Wallet] Failed to derive Ethereum wallet:', error.message);
    }
  }

  return result;
}

/**
 * Get wallet with private key for signing transactions
 * @param {string} chain - 'ethereum' or 'base'
 * @returns {Object} { address, privateKey }
 */
export function getWalletWithPrivateKey(chain) {
  const mnemonic = process.env.MNEMONIC;

  if (chain === 'ethereum' || chain === 'base') {
    if (!mnemonic) {
      throw new Error('MNEMONIC environment variable is not set');
    }
    return deriveEthereumWallet(mnemonic);
  }

  throw new Error(`Unknown chain: ${chain}`);
}

/**
 * Create ethers.js Wallet instance for signing
 * @param {string} chain - 'ethereum' or 'base'
 * @param {Object} provider - ethers.js provider
 * @returns {ethers.Wallet}
 */
export function getEthersWallet(chain, provider) {
  const wallet = getWalletWithPrivateKey(chain);
  return new ethers.Wallet(wallet.privateKey, provider);
}

export default {
  deriveEthereumWallet,
  getWalletAddresses,
  getWalletWithPrivateKey,
  getEthersWallet
};

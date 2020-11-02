import { Coin } from '@terra-money/terra.js'

export const formatCoin = (coin: Coin) => {
  return coin.amount.dividedBy(1000000).toNumber().toFixed(6)
}

export const formatDenom = (denom: string) => {
  return denom.substr(1).toUpperCase()
}

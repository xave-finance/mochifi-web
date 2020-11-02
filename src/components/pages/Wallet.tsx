import React, { useCallback, useContext, useEffect, useState } from 'react'
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@material-ui/core'
import { AppAction, AppContext } from '../contexts/AppContextProvider'
import SendToken from '../modules/wallet/SendToken'
import { Coins } from '@terra-money/terra.js'
import { formatCoin, formatDenom } from '../utils/CoinUtils'
import EventWrapper from '../modules/common/EventWrapper'
import { usersFromAddresses } from '../services/AccountService'

const Wallet = () => {
  const appContext = useContext(AppContext)
  const appState = appContext.state
  const [checkBalance, setCheckBalance] = useState(false)
  const [showSendToken, setShowSendToken] = useState(false)
  const [coins, setCoins] = useState(new Coins({ uluna: 0 }))
  const [activeDenom, setActiveDenom] = useState('uluna')

  const fetchWards = useCallback(async () => {
    if (!appState.contractAddress) return
    const res = await appState.terra.wasm.contractQuery(
      appState.contractAddress,
      { get_family_members: {} }
    )
    console.log('get_family_members result:', res)

    const addresses = (res as any).family_members as string[]
    const wards = await usersFromAddresses(addresses)
    appContext.dispatch({ type: AppAction.setWards, payload: wards })
  }, [appState.contractAddress])

  useEffect(() => {
    setCheckBalance(true)
    fetchWards()
  }, [])

  useEffect(() => {
    if (appState.contractAddress && checkBalance) {
      appState.terra.bank.balance(appState.contractAddress).then(newCoins => {
        console.log('balance:', JSON.stringify(newCoins))
        if (newCoins.toArray().length) {
          setCoins(newCoins)
        }
        setCheckBalance(false)
      })
    }
  }, [checkBalance, appState.contractAddress, appState.terra.bank])

  useEffect(() => {
    if (appState.shouldRefreshBalance) {
      setCheckBalance(true)

      appContext.dispatch({
        type: AppAction.setShouldRefreshBalance,
        payload: false
      })
    }
  }, [appState.shouldRefreshBalance])

  return (
    <EventWrapper>
      {showSendToken && (
        <SendToken
          denom={activeDenom}
          onCancel={() => {
            setShowSendToken(false)
          }}
          onSuccess={() => {
            setCheckBalance(true)
            setShowSendToken(false)
          }}
        />
      )}

      <Box textAlign="center" my={4}>
        <p>
          Hello, <b>{appState.username}</b>
        </p>
        <p>{appState.contractAddress}</p>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Coin</TableCell>
              <TableCell colSpan={2}>Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coins.map(coin => (
              <TableRow key={coin.denom}>
                <TableCell component="th" scope="row">
                  {formatDenom(coin.denom)}
                </TableCell>
                <TableCell>{formatCoin(coin)}</TableCell>
                <TableCell align="right" width={10}>
                  <Box ml={2}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => {
                        setActiveDenom(coin.denom)
                        setShowSendToken(true)
                      }}
                      size="small"
                      disabled={coin.amount.toNumber() === 0}
                    >
                      Send
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </EventWrapper>
  )
}

export default Wallet

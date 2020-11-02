import React, { useContext, useEffect, useState } from 'react'
import {
  CardContent,
  Typography,
  Box,
  TextField,
  CardActions,
  CircularProgress,
  Button
} from '@material-ui/core'
import { useSnackbar } from 'notistack'
import { fetchAccount } from '../../services/AccountService'
import { formatDenom } from '../../utils/CoinUtils'
import { AppContext } from '../../contexts/AppContextProvider'
import {
  Coins,
  MsgExecuteContract,
  MsgSend,
  StdFee
} from '@terra-money/terra.js'
import ModalCard from '../common/ModalCard'
import { AppEvents, fireEvent } from '../../services/EventService'

type SendTokenProps = {
  denom: string
  onCancel: () => void
  onSuccess: () => void
}

const SendToken = ({ denom, onCancel, onSuccess }: SendTokenProps) => {
  const appState = useContext(AppContext).state
  const [username, setUsername] = useState('')
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | undefined>(undefined)
  const { enqueueSnackbar, closeSnackbar } = useSnackbar()

  useEffect(() => {
    if (error) {
      enqueueSnackbar(error.message, { variant: 'error' })
    } else {
      closeSnackbar()
    }
  }, [error, enqueueSnackbar, closeSnackbar])

  const send = async () => {
    setIsLoading(true)

    if (username === '') {
      setError(new Error('You did not enter a username'))
      setIsLoading(false)
      return
    } else if (isNaN(Number(amount))) {
      setError(new Error('Invalid amount'))
      setIsLoading(false)
      return
    }

    const amountFormatted = `${Number(amount) * 1000000}`

    try {
      // Get recipient address from firebase
      const account = await fetchAccount(username)
      if (!account) {
        setError(new Error('This user does not exists!'))
        setIsLoading(false)
        return
      }

      const toAddress = account.data().walletAddress as string

      const msg = new MsgExecuteContract(
        appState.wallet!.key.accAddress,
        appState.contractAddress!,
        {
          send_tokens: {
            to_address: toAddress,
            amount: [
              {
                denom,
                amount: amountFormatted
              }
            ]
          }
        },
        {}
      )

      const fee = new StdFee(2657235, { uluna: 398586 })

      // Sign message with wallet key
      const tx = await appState.wallet!.createAndSignTx({
        msgs: [msg],
        fee
      })

      // Broadcast tx to the blockchain
      const txResult = await appState.terra.tx.broadcast(tx)
      console.log('send_tokens txResult:', txResult)

      if (txResult.code) {
        throw new Error('Failed to send tokens!')
      }

      fireEvent(AppEvents.tokensSent, appState.contractAddress!, toAddress)

      enqueueSnackbar(`Sent to ${username}!`, { variant: 'success' })
      onSuccess()
    } catch (err) {
      console.error(err)
      setIsLoading(false)
      setError(err)
    }
  }

  return (
    <ModalCard>
      <CardContent>
        <Typography variant="h5" component="h1">
          Send {formatDenom(denom)}
        </Typography>
        <Box mt={2}>
          <TextField
            fullWidth
            autoComplete="off"
            label="Username"
            onChange={e => {
              setUsername(e.currentTarget.value)
            }}
          />
        </Box>
        <Box my={1}>
          <TextField
            fullWidth
            autoComplete="off"
            label="Amount"
            onChange={e => {
              setAmount(e.currentTarget.value)
            }}
          />
        </Box>
      </CardContent>
      <CardActions>
        {isLoading ? (
          <CircularProgress size={24} />
        ) : (
          <>
            <Button size="small" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="small" color="primary" onClick={send}>
              Send
            </Button>
          </>
        )}
      </CardActions>
    </ModalCard>
  )
}

export default SendToken

import React, { useContext, useEffect, useState } from 'react'
import {
  Box,
  Button,
  CardActions,
  CardContent,
  TextField,
  Typography
} from '@material-ui/core'
import { fetchAccount } from '../../services/AccountService'
import { useSnackbar } from 'notistack'
import CircularProgress from '@material-ui/core/CircularProgress/CircularProgress'
import ModalCard from '../common/ModalCard'
import { AppContext } from '../../contexts/AppContextProvider'
import { MsgExecuteContract, StdFee } from '@terra-money/terra.js'

type AddGuardianProps = {
  onCancel: () => void
  onSuccess: (guardianAddress: string) => void
}

const AddGuardian = ({ onCancel, onSuccess }: AddGuardianProps) => {
  const appState = useContext(AppContext).state
  const [username, setUsername] = useState('')
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

  const addGuardian = async () => {
    setIsLoading(true)

    try {
      if (username === '') {
        throw new Error('You did not enter a username!')
      } else if (username === appState.username) {
        throw new Error('You cannot be a guardian of yourself!')
      }

      const account = await fetchAccount(username)
      if (!account) {
        throw new Error('This user does not exists!')
      }

      const guardianAddress = account.data().walletAddress

      const execute = new MsgExecuteContract(
        appState.wallet!.key.accAddress,
        appState.contractAddress!,
        {
          add_guardian: {
            guardian: guardianAddress
          }
        },
        {}
      )

      const fee = new StdFee(146400, { uluna: 21960 })

      const executeTx = await appState.wallet!.createAndSignTx({
        msgs: [execute],
        fee
      })

      const txResult = await appState.terra.tx.broadcast(executeTx)
      console.log('add_guardian txResult:', txResult)

      if (txResult.code) {
        if (
          txResult.raw_log ===
          'execute wasm contract failed: generic: guardian already added: failed to execute message; message index: 0'
        ) {
          throw new Error('Guardian already added!')
        }
        throw new Error('Failed to add Guardian!')
      }

      setIsLoading(false)
      onSuccess(guardianAddress)
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
          Add Guardian
        </Typography>
        <p>Enter your guardian's username</p>
        <Box>
          <TextField
            fullWidth
            autoComplete="off"
            label="Username"
            onChange={e => {
              setUsername(e.currentTarget.value)
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
            <Button size="small" color="primary" onClick={addGuardian}>
              Add
            </Button>
          </>
        )}
      </CardActions>
    </ModalCard>
  )
}

export default AddGuardian

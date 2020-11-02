import {
  CardContent,
  Typography,
  CardActions,
  CircularProgress,
  Button
} from '@material-ui/core'
import { MsgExecuteContract, StdFee } from '@terra-money/terra.js'
import { useSnackbar } from 'notistack'
import React, { useContext, useEffect, useState } from 'react'
import { AppAction, AppContext } from '../../contexts/AppContextProvider'
import { UserType } from '../../services/AccountService'
import { AppEvents, fireEvent } from '../../services/EventService'
import ModalCard from '../common/ModalCard'

type GuardianRequestProps = {
  ward: UserType
  onCancel: () => void
}

const GuardianRequest = ({ ward, onCancel }: GuardianRequestProps) => {
  const appContext = useContext(AppContext)
  const appState = appContext.state
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

  const acceptAddGuardian = async () => {
    setIsLoading(true)

    try {
      // 1. Confirm guardian request
      // Send `add_guardian_confirm` to ward's contract address
      const execute = new MsgExecuteContract(
        appState.wallet!.key.accAddress, // sender: guardian id key address
        appState.pendingGuardianRequest!.walletAddress, // contract: ward's wallet address
        {
          add_guardian_confirm: {
            guardian: appState.contractAddress! // guardian's wallet address
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
      console.log('add_guardian_confirm txResult:', txResult)

      if (txResult.code) {
        throw new Error('Failed to add Guardian!')
      }

      // 2. Add ward to guardian's family members
      // Send `add_family_member` to guardian's contract address
      const execute2 = new MsgExecuteContract(
        appState.wallet!.key.accAddress, // sender: guardian id key address
        appState.contractAddress!, // contract: guardian's wallet address
        {
          add_family_member: {
            family_member: appState.pendingGuardianRequest!.walletAddress // ward's wallet address
          }
        },
        {}
      )

      const fee2 = new StdFee(150509, { uluna: 22577 })

      const executeTx2 = await appState.wallet!.createAndSignTx({
        msgs: [execute2],
        fee: fee2
      })

      const txResult2 = await appState.terra.tx.broadcast(executeTx2)
      console.log('add_family_member txResult:', txResult2)

      if (txResult2.code) {
        throw new Error('Failed to add Guardian!')
      }

      enqueueSnackbar(`You are now a guardian of ${ward?.username}`, {
        variant: 'success'
      })
      fireEvent(
        AppEvents.addGuardianResponse,
        appState.contractAddress!,
        appState.pendingGuardianRequest!.walletAddress,
        { accepted: true }
      )
      appContext.dispatch({ type: AppAction.removePendingGuardianRequest })

      setIsLoading(false)
    } catch (err) {
      console.error(err)
      setIsLoading(false)
      setError(err)
    }
  }

  const declineAddGuardian = async () => {
    appContext.dispatch({ type: AppAction.removePendingGuardianRequest })
    onCancel()
  }

  return (
    <ModalCard>
      <CardContent>
        <Typography variant="h5" component="h1">
          Add Guardian Request
        </Typography>
        <p>
          <b>{ward.username}</b> has requested you to become his/her guardian.
        </p>
        <p>Would you like to confirm this request?</p>
      </CardContent>
      <CardActions>
        {isLoading ? (
          <CircularProgress size={24} />
        ) : (
          <>
            <Button size="small" onClick={declineAddGuardian}>
              Decline
            </Button>
            <Button size="small" color="primary" onClick={acceptAddGuardian}>
              Accept
            </Button>
          </>
        )}
      </CardActions>
    </ModalCard>
  )
}

export default GuardianRequest

import React, { useCallback, useContext, useEffect, useState } from 'react'
import ModalCard from '../common/ModalCard'
import {
  CardContent,
  Typography,
  CardActions,
  CircularProgress,
  Button
} from '@material-ui/core'
import { UserType } from '../../services/AccountService'
import { useSnackbar } from 'notistack'
import { AppAction, AppContext } from '../../contexts/AppContextProvider'
import { MsgExecuteContract, StdFee } from '@terra-money/terra.js'
import { AppEvents, fireEvent } from '../../services/EventService'

type RecoveryRequestProps = {
  ward: UserType
  onCancel: () => void
}

const RecoveryRequest = ({ ward, onCancel }: RecoveryRequestProps) => {
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

  const isRecovering = async (address: string) => {
    const res = await appState.terra.wasm.contractQuery(address, {
      get_recovery_status: {}
    })

    console.log('get_recovery_status response:', res)

    return (res as any).is_recovering as boolean
  }

  const getSigners = async (address: string) => {
    const res = await appState.terra.wasm.contractQuery(address, {
      get_signers: {}
    })

    console.log('get_signers response:', res)

    return (res as any).signers as string[]
  }

  const accept = async () => {
    setIsLoading(true)

    try {
      const recoveryExecuted = await isRecovering(
        appState.pendingRecoveryRequest!.walletAddress
      )

      if (!recoveryExecuted) {
        // Start recovery & sign the request
        const execute = new MsgExecuteContract(
          appState.wallet!.key.accAddress,
          appState.pendingRecoveryRequest!.walletAddress,
          {
            execute_recovery: {
              new_owner: appState.pendingRecoveryRequest!.ownerAddress,
              guardian: appState.contractAddress!
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
        console.log('execute_recovery txResult:', txResult)

        if (txResult.code) {
          throw new Error('Failed to accept recovery request!')
        }
      } else {
        // Sign recovery request
        const execute2 = new MsgExecuteContract(
          appState.wallet!.key.accAddress, // sender: guardian id key address
          appState.pendingRecoveryRequest!.walletAddress, // contract: ward's wallet address
          {
            guardian_approve_request: {
              guardian: appState.contractAddress! // guardian's wallet address
            }
          },
          {}
        )

        const fee2 = new StdFee(146400, { uluna: 21960 })

        const executeTx2 = await appState.wallet!.createAndSignTx({
          msgs: [execute2],
          fee: fee2
        })

        const txResult2 = await appState.terra.tx.broadcast(executeTx2)
        console.log('guardian_approve_request txResult:', txResult2)

        if (txResult2.code) {
          throw new Error('Failed to accept recovery request!')
        }
      }

      enqueueSnackbar(
        `You have approved the recovery of ${ward?.username}'s wallet`,
        {
          variant: 'success'
        }
      )

      fireEvent(
        AppEvents.accountRecoveryResponse,
        appState.contractAddress!,
        appState.pendingRecoveryRequest!.walletAddress,
        { accepted: true }
      )

      appContext.dispatch({ type: AppAction.removePendingRecoveryRequest })

      setIsLoading(false)
    } catch (err) {
      console.error(err)
      setIsLoading(false)
      setError(err)
    }
  }

  const decline = () => {
    appContext.dispatch({ type: AppAction.removePendingRecoveryRequest })
    onCancel()
  }

  return (
    <ModalCard>
      <CardContent>
        <Typography variant="h5" component="h1">
          Recovery Request
        </Typography>
        <p>
          <b>{ward.username}</b> wants to recover his/her wallet.
        </p>
        <p>
          As one of the designated guardian, your job is to review this request.
          What would you like to do?
        </p>
      </CardContent>
      <CardActions>
        {isLoading ? (
          <CircularProgress size={24} />
        ) : (
          <>
            <Button size="small" onClick={decline}>
              Decline
            </Button>
            <Button size="small" color="primary" onClick={accept}>
              Accept
            </Button>
          </>
        )}
      </CardActions>
    </ModalCard>
  )
}

export default RecoveryRequest

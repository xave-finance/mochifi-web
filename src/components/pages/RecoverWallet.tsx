import React, { useCallback, useContext, useEffect, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  makeStyles,
  Paper,
  TableContainer,
  TextField,
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell
} from '@material-ui/core'
import { fetchAccount, usernameForAddress } from '../services/AccountService'
import { useSnackbar } from 'notistack'
import DoneIcon from '@material-ui/icons/Done'
import { AppAction, AppContext } from '../contexts/AppContextProvider'
import {
  MnemonicKey,
  MsgExecuteContract,
  StdFee,
  Wallet
} from '@terra-money/terra.js'
import { AppEvents, fireEvent } from '../services/EventService'
import { useHistory } from 'react-router-dom'

const useStyles = makeStyles(theme => ({
  formWrapper: {
    marginTop: '4rem',
    textAlign: 'center'
  },
  guardiansWrapper: {
    marginTop: '2rem'
  }
}))

const RecoverWallet = () => {
  const appContext = useContext(AppContext)
  const appState = appContext.state
  const classes = useStyles()
  const history = useHistory()
  const [username, setUsername] = useState('')
  const [newWallet, setNewWallet] = useState<Wallet | undefined>(undefined)
  const [smartContractAddress, setSmartContractAddress] = useState<
    string | undefined
  >(undefined)
  const [guardians, setGuardians] = useState<string[]>([
    'Guardian 1',
    'Guardian 2',
    'Guardian 3'
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | undefined>(undefined)
  const { enqueueSnackbar, closeSnackbar } = useSnackbar()
  const [isFunded, setIsFunded] = useState(false)
  const [sigCount, setSigCount] = useState(0)

  const checkOwner = useCallback(async () => {
    console.log('checking owner...', smartContractAddress, newWallet, username)
    if (!smartContractAddress) return

    const res = await appState.terra.wasm.contractQuery(smartContractAddress, {
      get_owner: {}
    })
    console.log('get_owner res:', res)

    const ownerAddress = (res as any).owner as string

    if (ownerAddress === newWallet!.key.accAddress) {
      // Recovery successful! Update app state
      appContext.dispatch({
        type: AppAction.createWallet,
        payload: {
          wallet: newWallet,
          contractAddress: smartContractAddress,
          username
        }
      })

      appContext.dispatch({
        type: AppAction.setIsRecovering,
        payload: false
      })

      enqueueSnackbar(`Your wallet has been successfully recovered!`, {
        variant: 'success'
      })

      // Redirect to wallet page
      history.replace('/wallet')
    } else {
      checkSignatures()
    }
  }, [smartContractAddress, newWallet, username])

  const checkSignatures = useCallback(async () => {
    if (!smartContractAddress) return

    const res = await appState.terra.wasm.contractQuery(smartContractAddress, {
      get_signers: {}
    })
    console.log('get_signers res:', res)

    const signers = (res as any).signers as string[]
    setSigCount(signers.length)
  }, [smartContractAddress])

  useEffect(() => {
    if (appState.shouldCheckRecoveryProgress) {
      checkOwner()

      appContext.dispatch({
        type: AppAction.setShouldCheckRecoveryProgress,
        payload: false
      })
    }
  }, [appState.shouldCheckRecoveryProgress])

  useEffect(() => {
    const fetchRecoveryInfo = async () => {
      if (!appState.wallet || !appState.isRecovering) {
        console.log('Wallet is not recovering or no wallet yet')
        return
      }

      setIsLoading(true)

      try {
        const savedUsername = appState.username!
        const account = await fetchAccount(savedUsername)
        if (!account) {
          setNewWallet(undefined)
          setUsername('')
          throw new Error(
            'Failed to find wallet address. Please restart recovery!'
          )
        }

        const walletContractAddress = account.data().walletAddress
        setSmartContractAddress(walletContractAddress)

        setNewWallet(appState.wallet)
        setUsername(savedUsername)
        setIsFunded(appState.isWalletFunded)

        if (appState.isWalletFunded) {
          // Notify guardians again
          fireEvent(
            AppEvents.accountRecovery,
            walletContractAddress,
            '_GUARDIANS_',
            {
              ownerAddress: appState.wallet.key.accAddress
            }
          )
        }

        setIsLoading(false)
      } catch (err) {
        console.error(err)
        setIsLoading(false)
        setError(err)
      }
    }

    fetchRecoveryInfo()
  }, [appState.wallet])

  useEffect(() => {
    if (error) {
      enqueueSnackbar(error.message, { variant: 'error' })
    } else {
      closeSnackbar()
    }
  }, [error, enqueueSnackbar, closeSnackbar])

  useEffect(() => {
    if (isFunded) {
      checkOwner()
    }
  }, [isFunded])

  const validateUsername = async () => {
    setIsLoading(true)

    try {
      const account = await fetchAccount(username)
      if (!account) {
        throw new Error('This user does not exists!')
      }

      setSmartContractAddress(account.data().walletAddress)

      const key = new MnemonicKey()
      const wallet = appState.terra.wallet(key)
      setNewWallet(wallet)
      console.log('newWallet:', wallet)

      // Update app state
      appContext.dispatch({
        type: AppAction.createWallet,
        payload: {
          wallet,
          contractAddress: undefined,
          username
        }
      })

      appContext.dispatch({
        type: AppAction.setIsRecovering,
        payload: true
      })

      setIsLoading(false)
    } catch (err) {
      console.error(err)
      setIsLoading(false)
      setError(err)
    }
  }

  const startRecovery = async () => {
    if (!newWallet || !smartContractAddress) return

    setIsFunded(true)

    appContext.dispatch({
      type: AppAction.setIsWalletFunded,
      payload: true
    })

    fireEvent(AppEvents.accountRecovery, smartContractAddress, '_GUARDIANS_', {
      ownerAddress: newWallet.key.accAddress
    })
  }

  // const isRequestApproved = (guardian: string) => {
  //   if (guardian === 'Guardian 2') {
  //     return true
  //   } else {
  //     return false
  //   }
  // }

  return (
    <div>
      <Typography variant="h4" component="h1">
        Recover Wallet
      </Typography>

      {!newWallet ? (
        <Box className={classes.formWrapper}>
          <p>Please enter your username</p>
          <form noValidate autoComplete="off">
            <TextField
              autoComplete="off"
              label="Username"
              onChange={e => {
                setUsername(e.currentTarget.value)
              }}
            />
            <Box mt={4}>
              {isLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={validateUsername}
                >
                  Start recovery
                </Button>
              )}
            </Box>
          </form>
        </Box>
      ) : (
        <>
          {isFunded ? (
            <Box className={classes.guardiansWrapper}>
              <Typography variant="h6" component="h2">
                Contact your Guardians
              </Typography>
              <p>
                We are waiting for the majority of your guardians to approve
                your request...
              </p>
              <p>
                <b>{sigCount} guardian(s) has approved your request </b>
                <CircularProgress size={18} />
              </p>
              {/* <TableContainer component={Paper}>
                <Table aria-label="simple table">
                  <TableBody>
                    {guardians.map(username => (
                      <TableRow key={username} hover>
                        <TableCell>{username}</TableCell>
                        <TableCell align="right">
                          {isRequestApproved(username) ? (
                            <DoneIcon htmlColor="green" />
                          ) : (
                            <CircularProgress size={18} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer> */}
            </Box>
          ) : (
            <Box mt={5} textAlign="center">
              <p>
                Please fund your account so we can start the recovery of your
                wallet
              </p>
              <p>
                <b>{newWallet.key.accAddress}</b>
              </p>
              <Box mt={4}>
                {isLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  <Button
                    onClick={startRecovery}
                    variant="contained"
                    color="primary"
                  >
                    Account funded
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </>
      )}
    </div>
  )
}

export default RecoverWallet

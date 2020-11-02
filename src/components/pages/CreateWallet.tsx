import React, { useContext, useEffect, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  makeStyles,
  TextField,
  Typography
} from '@material-ui/core'
import {
  MnemonicKey,
  MsgInstantiateContract,
  StdFee,
  Wallet
} from '@terra-money/terra.js'
import { AppAction, AppContext } from '../contexts/AppContextProvider'
import { useHistory } from 'react-router-dom'
import { createAccount, fetchAccount } from '../services/AccountService'
import { useSnackbar } from 'notistack'

const WALLET_CONTRACT_CODE_ID = 139
// const WALLET_CONTRACT_CODE_ID = 2

const useStyles = makeStyles(theme => ({
  title: {
    marginBottom: '3rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  textField: {
    marginBottom: '1rem'
  }
}))

const CreateWallet = () => {
  const context = useContext(AppContext)
  const terra = context.state.terra
  const classes = useStyles()
  const [isLoading, setIsLoading] = useState(false)
  const history = useHistory()
  const [username, setUsername] = useState('')
  const [error, setError] = useState<Error | undefined>(undefined)
  const { enqueueSnackbar, closeSnackbar } = useSnackbar()
  const [wallet, setWallet] = useState<Wallet | undefined>(undefined)

  useEffect(() => {
    if (error) {
      enqueueSnackbar(error.message, { variant: 'error' })
    } else {
      closeSnackbar()
    }
  }, [error, enqueueSnackbar, closeSnackbar])

  const createWallet = async () => {
    if (username === '') {
      setError(new Error('Please provide your username'))
      return
    }

    setError(undefined)
    setIsLoading(true)

    try {
      // Get recipient address from firebase
      const account = await fetchAccount(username)
      if (account) {
        setError(new Error('Username is already taken!'))
        setIsLoading(false)
        return
      }

      const key = new MnemonicKey()
      const newWallet = terra.wallet(key)
      setWallet(newWallet)
      setIsLoading(false)
    } catch (err) {
      console.error(err)
      setIsLoading(false)
      setError(err)
    }
  }

  const createSmartContract = async () => {
    if (!wallet) {
      return
    }

    setError(undefined)
    setIsLoading(true)

    try {
      // Create a wallet smart contract for the user
      const instantiate = new MsgInstantiateContract(
        wallet.key.accAddress, // owner
        WALLET_CONTRACT_CODE_ID, // code ID
        {}, // InitMsg
        {}, // init coins
        false // migratable
      )

      const fee = new StdFee(2657235, { uluna: 398586 })

      const instantiateTx = await wallet.createAndSignTx({
        msgs: [instantiate],
        fee
      })

      const txResult = await terra.tx.broadcast(instantiateTx)
      console.log('MsgInstantiateContract txResult:', txResult)

      if (txResult.code) {
        throw new Error('Failed to create smart contract!')
      }

      const contractAddress = txResult.logs[0].events[0].attributes[2].value

      // Create account in firestore
      await createAccount(username, wallet.key.accAddress, contractAddress)

      // Update app state
      context.dispatch({
        type: AppAction.createWallet,
        payload: {
          wallet,
          contractAddress,
          username
        }
      })

      history.push('/wallet')
    } catch (err) {
      setError(err)
      setIsLoading(false)
    }
  }

  return (
    <div>
      <Typography variant="h4" component="h1" className={classes.title}>
        Create Wallet
      </Typography>

      {!wallet ? (
        <form noValidate autoComplete="off" className={classes.form}>
          <TextField
            autoComplete="off"
            label="Username"
            className={classes.textField}
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
                onClick={createWallet}
              >
                Create my wallet
              </Button>
            )}
          </Box>
        </form>
      ) : (
        <Box mt={5} textAlign="center">
          <p>
            Please fund your account so we can create your smart contract wallet
          </p>
          <p>
            <b>{wallet.key.accAddress}</b>
          </p>
          <Box mt={4}>
            {isLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Button
                onClick={createSmartContract}
                variant="contained"
                color="primary"
              >
                Account funded
              </Button>
            )}
          </Box>
        </Box>
      )}
    </div>
  )
}

export default CreateWallet

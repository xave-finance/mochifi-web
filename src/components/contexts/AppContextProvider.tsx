import { LCDClient, MnemonicKey, Wallet } from '@terra-money/terra.js'
import React, { useReducer, createContext, useEffect, useState } from 'react'
import SecureLS from 'secure-ls'
import { UserType } from '../services/AccountService'
import {
  AppEvents,
  EventType,
  GuardianRequestType,
  RecoveryRequestType
} from '../services/EventService'
import { db } from '../services/FirebaseService'
import reducer from './AppReducer'

export type AppStateType = {
  terra: LCDClient
  wallet: Wallet | undefined
  mnemonicPhrase: string | undefined
  contractAddress: string | undefined
  username: string | undefined
  wards: UserType[]
  isRecovering: boolean
  isWalletFunded: boolean
  pendingGuardianRequest: GuardianRequestType | undefined
  pendingRecoveryRequest: RecoveryRequestType | undefined
  shouldReloadGuardians: boolean
  shouldCheckRecoveryProgress: boolean
  shouldRefreshBalance: boolean
}

export type ActionType = {
  type: AppAction
  payload?: any
}

enum StoreKey {
  mnemonicPhrase = 'mnemonicPhrase',
  contractAddress = 'contractAddress',
  username = 'username',
  wards = 'wards',
  isRecovering = 'isRecovering',
  isWalletFunded = 'isWalletFunded'
}

export enum AppAction {
  setAppSecret = 'setAppSecret',
  createWallet = 'createWallet',
  setWards = 'setWards',
  setIsRecovering = 'setIsRecovering',
  setIsWalletFunded = 'setIsWalletFunded',
  setPendingGuardianRequest = 'setPendingGuardianRequest',
  removePendingGuardianRequest = 'removePendingGuardianRequest',
  setPendingRecoveryRequest = 'setPendingRecoveryRequest',
  removePendingRecoveryRequest = 'removePendingRecoveryRequest',
  setShouldReloadGuardians = 'setShouldReloadGuardians',
  setShouldCheckRecoveryProgress = 'setShouldCheckRecoveryProgress',
  setShouldRefreshBalance = 'setShouldRefreshBalance'
}

const initialState = (() => {
  const terra = new LCDClient({
    URL: 'https://tequila-lcd.terra.dev',
    chainID: 'tequila-0004'
  })

  // const terra = new LCDClient({
  //   URL: 'http://localhost:1317',
  //   chainID: 'localterra'
  // })

  return {
    terra,
    wallet: undefined,
    mnemonicPhrase: undefined,
    contractAddress: undefined,
    username: undefined,
    wards: [],
    isRecovering: false,
    isWalletFunded: false,
    pendingGuardianRequest: undefined,
    pendingRecoveryRequest: undefined,
    shouldReloadGuardians: false,
    shouldCheckRecoveryProgress: false,
    shouldRefreshBalance: false
  }
})()

export const AppContext = createContext<{
  state: AppStateType
  dispatch: React.Dispatch<any>
  isInitializing: () => boolean
}>({
  state: initialState,
  dispatch: () => null,
  isInitializing: () => true
})

// Workaround vars for firestore onSnapshot keeping a stale version of the state
let lastProcessedEventDate = new Date()
let isInRecoveryMode = false
let latestWards: UserType[] = []

const AppContextProvider: React.FC = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [appSecret, setAppSecret] = useState<string | undefined>(undefined)
  const [secureStorage, setSecureStorage] = useState<SecureLS | undefined>(
    undefined
  )

  // Fetch appSecret from firebase on component load
  useEffect(() => {
    const fetchAppSecret = async () => {
      const snap = await db
        .collection('appSecretKeys')
        .where('appName', '==', 'mochifi')
        .limit(1)
        .get()

      if (!snap.empty) {
        const secretKey = snap.docs[0].data().key
        setAppSecret(secretKey)
      }
    }

    fetchAppSecret()
  }, [])

  // Initialize secureStorage once appSecret is available
  useEffect(() => {
    if (appSecret) {
      const ls = new SecureLS({
        encodingType: 'aes',
        encryptionSecret: appSecret
      })
      setSecureStorage(ls)
    }
  }, [appSecret])

  // Attempt to restore wallet
  useEffect(() => {
    if (!secureStorage) return

    // Attempt to restore wallet from wallet key from secureStorage
    let mnemonicPhrase: string | undefined = undefined
    const mnemonicPhraseData = secureStorage.get(StoreKey.mnemonicPhrase)
    if (mnemonicPhraseData) {
      mnemonicPhrase = mnemonicPhraseData as string
    }

    let wallet: Wallet | undefined = undefined
    if (mnemonicPhrase) {
      const mk = new MnemonicKey({
        mnemonic: mnemonicPhrase
      })
      wallet = state.terra.wallet(mk)
    }

    // No existing wallet available from secureStorage
    if (!wallet) return

    // Proceed with wallet restoration
    let contractAddress: string | undefined = undefined
    const contractAddressData = secureStorage.get(StoreKey.contractAddress)
    if (contractAddressData) {
      contractAddress = contractAddressData as string
    }

    let username: string | undefined = undefined
    const userData = secureStorage.get(StoreKey.username)
    if (userData) {
      username = userData as string
    }

    dispatch({
      type: AppAction.createWallet,
      payload: {
        wallet,
        mnemonicPhrase,
        contractAddress,
        username
      }
    })

    const wardsData = secureStorage.get(StoreKey.wards)
    if (wardsData) {
      const wards = wardsData as UserType[]
      if (wards.length) {
        dispatch({
          type: AppAction.setWards,
          payload: wards
        })
      }
    }

    const isRecoveringData = secureStorage.get(StoreKey.isRecovering)
    if (isRecoveringData) {
      const isRecovering = isRecoveringData as boolean
      dispatch({
        type: AppAction.setIsRecovering,
        payload: isRecovering
      })
    }

    const isWalletFundedData = secureStorage.get(StoreKey.isWalletFunded)
    if (isWalletFundedData) {
      const isWalletFunded = isWalletFundedData as boolean
      dispatch({
        type: AppAction.setIsWalletFunded,
        payload: isWalletFunded
      })
    }
  }, [secureStorage, state.terra])

  // Listen & act on firestore events
  useEffect(() => {
    if (!state.wallet) return

    return db
      .collection('mochifiEvents')
      .where('date', '>', new Date())
      .onSnapshot(snapshot => {
        console.log('lastProcessedEventDate:', lastProcessedEventDate)
        snapshot.forEach(doc => {
          const event = doc.data() as EventType
          event.date = doc.data().date.toDate()
          console.log('new event! ', event)

          if (event.date > lastProcessedEventDate) {
            console.log('checking event: ', event.name)
            lastProcessedEventDate = event.date

            if (
              event.name === AppEvents.addGuardian &&
              event.recipient === state.contractAddress
            ) {
              dispatch({
                type: AppAction.setPendingGuardianRequest,
                payload: {
                  walletAddress: event.sender
                }
              })
            } else if (
              event.name === AppEvents.addGuardianResponse &&
              event.recipient === state.contractAddress
            ) {
              dispatch({
                type: AppAction.setShouldReloadGuardians,
                payload: true
              })
            } else if (event.name === AppEvents.accountRecovery) {
              const matches = latestWards.filter(
                u => u.address === event.sender
              )
              if (matches.length) {
                dispatch({
                  type: AppAction.setPendingRecoveryRequest,
                  payload: {
                    walletAddress: event.sender,
                    ownerAddress: event.payload.ownerAddress
                  }
                })
              }
            } else if (
              event.name === AppEvents.accountRecoveryResponse &&
              isInRecoveryMode
            ) {
              dispatch({
                type: AppAction.setShouldCheckRecoveryProgress,
                payload: true
              })
            } else if (
              event.name === AppEvents.tokensSent &&
              event.recipient === state.contractAddress
            ) {
              dispatch({
                type: AppAction.setShouldRefreshBalance,
                payload: true
              })
            } else {
              console.log('unhandled event')
            }
          } else {
            console.log('event skipped')
          }
        })
      })
  }, [state.wallet])

  // Persisting mnemonic phrase to disk
  useEffect(() => {
    if (!secureStorage) return

    if (state.mnemonicPhrase) {
      secureStorage.set(StoreKey.mnemonicPhrase, state.mnemonicPhrase)
    } else {
      secureStorage.remove(StoreKey.mnemonicPhrase)
    }
  }, [state.mnemonicPhrase, secureStorage])

  // Persisting contractAddress to disk
  useEffect(() => {
    if (!secureStorage) return

    if (state.contractAddress) {
      secureStorage.set(StoreKey.contractAddress, state.contractAddress)
    } else {
      secureStorage.remove(StoreKey.contractAddress)
    }
  }, [state.contractAddress, secureStorage])

  // Persisting username to disk
  useEffect(() => {
    if (!secureStorage) return

    if (state.username) {
      secureStorage.set(StoreKey.username, state.username)
    } else {
      secureStorage.remove(StoreKey.username)
    }
  }, [state.username, secureStorage])

  // Persisting wards to disk
  useEffect(() => {
    if (!secureStorage) return

    if (state.wards) {
      secureStorage.set(StoreKey.wards, state.wards)
    } else {
      secureStorage.remove(StoreKey.wards)
    }
    latestWards = state.wards
  }, [state.wards, secureStorage])

  // Persisting isRecovering to disk
  useEffect(() => {
    if (!secureStorage) return
    isInRecoveryMode = state.isRecovering
    secureStorage.set(StoreKey.isRecovering, state.isRecovering)
  }, [state.isRecovering, secureStorage])

  // Persisting isWalletFunded to disk
  useEffect(() => {
    if (!secureStorage) return
    secureStorage.set(StoreKey.isWalletFunded, state.isWalletFunded)
  }, [state.isWalletFunded, secureStorage])

  const isInitializing = () => {
    return appSecret === undefined
  }

  return (
    <AppContext.Provider value={{ state, dispatch, isInitializing }}>
      {children}
    </AppContext.Provider>
  )
}

export default AppContextProvider

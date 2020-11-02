import { Wallet } from '@terra-money/terra.js'
import { UserType } from '../services/AccountService'
import {
  GuardianRequestType,
  RecoveryRequestType
} from '../services/EventService'
import { ActionType, AppAction, AppStateType } from './AppContextProvider'

export type CreateWalletPayloadType = {
  wallet: Wallet
  contractAddress?: string
  username: string
}

const reducer = (prevState: AppStateType, action: ActionType): AppStateType => {
  switch (action.type) {
    case AppAction.createWallet:
      const {
        wallet,
        contractAddress,
        username
      } = action.payload as CreateWalletPayloadType

      return {
        ...prevState,
        wallet,
        mnemonicPhrase: (wallet.key as any)['mnemonic'],
        contractAddress,
        username
      }

    case AppAction.setWards:
      return {
        ...prevState,
        wards: action.payload as UserType[]
      }

    case AppAction.setIsRecovering:
      return {
        ...prevState,
        isRecovering: action.payload as boolean
      }

    case AppAction.setIsWalletFunded:
      return {
        ...prevState,
        isWalletFunded: action.payload as boolean
      }

    case AppAction.setPendingGuardianRequest:
      return {
        ...prevState,
        pendingGuardianRequest: action.payload as GuardianRequestType
      }

    case AppAction.removePendingGuardianRequest:
      return {
        ...prevState,
        pendingGuardianRequest: undefined
      }

    case AppAction.setPendingRecoveryRequest:
      return {
        ...prevState,
        pendingRecoveryRequest: action.payload as RecoveryRequestType
      }

    case AppAction.removePendingRecoveryRequest:
      return {
        ...prevState,
        pendingRecoveryRequest: undefined
      }

    case AppAction.setShouldReloadGuardians:
      return {
        ...prevState,
        shouldReloadGuardians: action.payload as boolean
      }

    case AppAction.setShouldCheckRecoveryProgress:
      return {
        ...prevState,
        shouldCheckRecoveryProgress: action.payload as boolean
      }

    case AppAction.setShouldRefreshBalance:
      return {
        ...prevState,
        shouldRefreshBalance: action.payload as boolean
      }

    default:
      return prevState
  }
}

export default reducer

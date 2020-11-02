import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../../contexts/AppContextProvider'
import { usernameForAddress, UserType } from '../../services/AccountService'
import GuardianRequest from '../guardians/GuardianRequest'
import RecoveryRequest from '../guardians/RecoveryRequest'

const EventWrapper: React.FC = ({ children }) => {
  const appState = useContext(AppContext).state
  const [ward, setWard] = useState<UserType | undefined>(undefined)

  useEffect(() => {
    if (!appState.pendingGuardianRequest && !appState.pendingRecoveryRequest)
      return

    const getWardUsername = async () => {
      const address = appState.pendingGuardianRequest
        ? appState.pendingGuardianRequest.walletAddress
        : appState.pendingRecoveryRequest!.walletAddress
      const username = await usernameForAddress(address)
      setWard({
        username,
        address
      })
    }

    getWardUsername()
  }, [appState.pendingGuardianRequest, appState.pendingRecoveryRequest])

  return (
    <div>
      {appState.pendingGuardianRequest && ward && (
        <GuardianRequest ward={ward} onCancel={() => {}} />
      )}

      {appState.pendingRecoveryRequest && ward && (
        <RecoveryRequest ward={ward} onCancel={() => {}} />
      )}

      {children}
    </div>
  )
}

export default EventWrapper

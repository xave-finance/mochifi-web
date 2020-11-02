import { db } from './FirebaseService'

export enum AppEvents {
  addGuardian = 'addGuardian',
  addGuardianResponse = 'addGuardianResponse',
  accountRecovery = 'accountRecovery',
  accountRecoveryResponse = 'accountRecoveryResponse',
  tokensSent = 'tokensSent'
}

export type EventType = {
  name: string
  sender: string
  recipient: string
  payload: any
  date: Date
}

export type GuardianRequestType = {
  walletAddress: string
}

export type RecoveryRequestType = {
  walletAddress: string
  ownerAddress: string
}

export const fireEvent = async (
  eventType: AppEvents,
  sender: string,
  recipient: string,
  payload?: any
) => {
  let data: any = {
    name: eventType,
    sender,
    recipient,
    date: new Date()
  }

  if (payload) {
    data.payload = payload
  }

  await db.collection('mochifiEvents').add(data)
}

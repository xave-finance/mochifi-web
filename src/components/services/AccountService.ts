import { db } from './FirebaseService'

export type UserType = {
  username: string
  address: string
}

export const createAccount = async (
  username: string,
  idAddress: string,
  walletAddress: string
) => {
  const account = await fetchAccount(username)
  if (account) {
    throw new Error('Username already exists!')
  }

  await db
    .collection('mochifiUsers')
    .add({ username, idAddress, walletAddress })
}

export const fetchAccount = async (username: string) => {
  const snap = await db
    .collection('mochifiUsers')
    .where('username', '==', username)
    .limit(1)
    .get()

  return snap.empty ? undefined : snap.docs[0]
}

export const usernameForAddress = async (address: string) => {
  const snap = await db
    .collection('mochifiUsers')
    .where('walletAddress', '==', address)
    .limit(1)
    .get()

  return snap.empty ? 'Unknown' : (snap.docs[0].data().username as string)
}

export const usersFromAddresses = async (addresses: string[]) => {
  let users: UserType[] = []

  if (addresses.length) {
    let promises: Promise<string>[] = []
    addresses.forEach(g => {
      promises.push(usernameForAddress(g))
    })

    const res = await Promise.all(promises)
    for (let i = 0; i < res.length; i++) {
      users.push({
        username: res[i],
        address: addresses[i] as string
      })
    }
  }

  return users
}

import React, { useCallback, useContext, useEffect, useState } from 'react'
import {
  Box,
  Fab,
  makeStyles,
  Paper,
  Tab,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Tabs,
  Typography
} from '@material-ui/core'
import AddIcon from '@material-ui/icons/Add'
import AddGuardian from '../modules/guardians/AddGuardian'
import NotificationsActiveIcon from '@material-ui/icons/NotificationsActive'
import RecoveryRequest from '../modules/guardians/RecoveryRequest'
import { AppAction, AppContext } from '../contexts/AppContextProvider'
import { usersFromAddresses, UserType } from '../services/AccountService'
import { useSnackbar } from 'notistack'
import { AppEvents, fireEvent } from '../services/EventService'
import EventWrapper from '../modules/common/EventWrapper'

const useStyles = makeStyles(theme => ({
  fab: {
    position: 'absolute',
    bottom: theme.spacing(10),
    right: theme.spacing(2)
  }
}))

const Guardians = () => {
  const appContext = useContext(AppContext)
  const appState = appContext.state
  const [tabValue, setTabValue] = useState(0)
  const [showAddGuardian, setShowAddGuardian] = useState(false)
  const [showRecoveryRequest, setShowRecoveryRequest] = useState(false)
  const classes = useStyles()
  const [guardians, setGuardians] = useState<UserType[]>([])
  const [pendingGuardians, setPendingGuardians] = useState<UserType[]>([])
  const [family, setFamily] = useState<UserType[]>(appState.wards)
  const [selectedFamily, setSelectedFamily] = useState<UserType | undefined>(
    undefined
  )
  const { enqueueSnackbar } = useSnackbar()

  const fetchGuardians = useCallback(async () => {
    if (!appState.contractAddress) return

    const res = await appState.terra.wasm.contractQuery(
      appState.contractAddress,
      { get_guardians: {} }
    )
    console.log('get_guardians result:', res)

    const addresses = (res as any).guardians as string[]
    setGuardians(await usersFromAddresses(addresses))

    const res2 = await appState.terra.wasm.contractQuery(
      appState.contractAddress,
      { get_pending_guardians: {} }
    )
    console.log('get_pending_guardians result:', res2)

    const addresses2 = (res2 as any).guardians as string[]
    setPendingGuardians(await usersFromAddresses(addresses2))
  }, [appState.contractAddress])

  const fetchFamily = useCallback(async () => {
    if (!appState.contractAddress) return
    const res = await appState.terra.wasm.contractQuery(
      appState.contractAddress,
      { get_family_members: {} }
    )
    console.log('get_family_members result:', res)

    const addresses = (res as any).family_members as string[]
    setFamily(await usersFromAddresses(addresses))
  }, [appState.contractAddress])

  useEffect(() => {
    appContext.dispatch({ type: AppAction.setWards, payload: family })
  }, [family])

  useEffect(() => {
    if (appState.shouldReloadGuardians) {
      fetchGuardians()

      appContext.dispatch({
        type: AppAction.setShouldReloadGuardians,
        payload: false
      })
    }
  }, [appState.shouldReloadGuardians])

  useEffect(() => {
    fetchGuardians()
    fetchFamily()
  }, [])

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTabValue(newValue)
  }

  const hasPendingRequest = (user: UserType) => {
    return false
  }

  const familyClicked = (user: UserType) => {
    if (!hasPendingRequest(user)) return

    setSelectedFamily(user)
    setShowRecoveryRequest(true)
  }

  return (
    <EventWrapper>
      {showAddGuardian && (
        <AddGuardian
          onCancel={() => {
            setShowAddGuardian(false)
          }}
          onSuccess={guardianAddress => {
            fireEvent(
              AppEvents.addGuardian,
              appState.contractAddress!,
              guardianAddress
            )
            setShowAddGuardian(false)
            enqueueSnackbar('Guardian request has been sent!', {
              variant: 'success'
            })
            fetchGuardians() // refresh pending guardians
          }}
        />
      )}

      {showRecoveryRequest && selectedFamily && (
        <RecoveryRequest
          ward={selectedFamily}
          onCancel={() => {
            setShowRecoveryRequest(false)
          }}
        />
      )}

      <Box mb={2}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab label="Who protects me" />
          <Tab label="Who I protect" />
        </Tabs>
      </Box>

      <div hidden={tabValue !== 0}>
        <TableContainer component={Paper}>
          <Table aria-label="simple table">
            {guardians.length === 0 && (
              <caption>You have no guardians yet</caption>
            )}
            <TableBody>
              {guardians.map(user => (
                <TableRow key={user.address} hover>
                  <TableCell>{user.username}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {pendingGuardians.length > 0 && (
          <>
            <Box mt={4} mb={1}>
              <Typography variant="h6" component="h2">
                Pending Guardians
              </Typography>
            </Box>
            <TableContainer component={Paper}>
              <Table aria-label="simple table">
                <TableBody>
                  {pendingGuardians.map(user => (
                    <TableRow key={user.address} hover>
                      <TableCell>{user.username}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        <Fab
          color="primary"
          className={classes.fab}
          onClick={() => setShowAddGuardian(true)}
        >
          <AddIcon />
        </Fab>
      </div>

      <div hidden={tabValue !== 1}>
        <TableContainer component={Paper}>
          <Table aria-label="simple table">
            {family.length === 0 && <caption>You have no family yet</caption>}
            <TableBody>
              {family.map(user => (
                <TableRow
                  key={user.address}
                  hover
                  onClick={() => familyClicked(user)}
                >
                  <TableCell>{user.username}</TableCell>
                  <TableCell align="right">
                    {hasPendingRequest(user) && (
                      <NotificationsActiveIcon color="error" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </EventWrapper>
  )
}

export default Guardians

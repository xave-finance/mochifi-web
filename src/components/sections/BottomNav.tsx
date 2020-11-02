import React, { useContext, useEffect } from 'react'
import {
  BottomNavigation,
  BottomNavigationAction,
  makeStyles
} from '@material-ui/core'
import AccountBalanceWalletOutlinedIcon from '@material-ui/icons/AccountBalanceWalletOutlined'
import SecurityOutlinedIcon from '@material-ui/icons/SecurityOutlined'
import { AppContext } from '../contexts/AppContextProvider'
import { useHistory, useLocation } from 'react-router-dom'

const useStyles = makeStyles(theme => ({
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    width: '100%'
  }
}))

const BottomNav = () => {
  const [value, setValue] = React.useState(0)
  const context = useContext(AppContext)
  const classes = useStyles()
  const { pathname: currentPath } = useLocation()
  const history = useHistory()

  useEffect(() => {
    if (currentPath === '/wallet') {
      setValue(0)
    } else {
      setValue(1)
    }
  }, [currentPath])

  if (!context.state.wallet || context.state.isRecovering) {
    return <></>
  }

  return (
    <BottomNavigation
      value={value}
      onChange={(event, newValue) => {
        setValue(newValue)
        history.replace(newValue === 0 ? '/wallet' : '/guardians')
      }}
      showLabels
      className={classes.bottomNav}
    >
      <BottomNavigationAction
        label="Wallet"
        icon={<AccountBalanceWalletOutlinedIcon />}
      />
      <BottomNavigationAction
        label="Guardians"
        icon={<SecurityOutlinedIcon />}
      />
    </BottomNavigation>
  )
}

export default BottomNav

import React, { useContext } from 'react'
import { Button, makeStyles, Box, CircularProgress } from '@material-ui/core'
import { useHistory } from 'react-router-dom'
import { AppContext } from '../contexts/AppContextProvider'
import BigMochiLogo from '../../logo.svg'

const useStyles = makeStyles(theme => ({
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '80vh'
  },
  logo: {
    width: '80%',
    maxWidth: '320px'
  },
  paper: {
    marginTop: theme.spacing(12),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  }
}))

const GetStarted = () => {
  const context = useContext(AppContext)
  const classes = useStyles()
  const history = useHistory()

  if (context.state.wallet) {
    if (context.state.isRecovering) {
      history.replace('/recover-wallet')
    } else {
      history.replace('/wallet')
    }
  }

  if (context.isInitializing()) {
    return (
      <div className={classes.loading}>
        <CircularProgress />
      </div>
    )
  }

  return (
    <div className={classes.paper}>
      <img src={BigMochiLogo} className={classes.logo} alt="BigMochi Logo" />
      <Box mt={8}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => history.push('/create-wallet')}
        >
          Create wallet
        </Button>
      </Box>
      <Box mt={4}>
        <Button onClick={() => history.push('/recover-wallet')}>
          Recover wallet
        </Button>
      </Box>
    </div>
  )
}

export default GetStarted

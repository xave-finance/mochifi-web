import {
  Container,
  createMuiTheme,
  CssBaseline,
  makeStyles,
  ThemeProvider
} from '@material-ui/core'
import React from 'react'
import { BrowserRouter, Route, Switch } from 'react-router-dom'
import './App.css'
import CreateWallet from './components/pages/CreateWallet'
import GetStarted from './components/pages/GetStarted'
import RecoverWallet from './components/pages/RecoverWallet'
import Wallet from './components/pages/Wallet'
import WalletRoute from './components/routes/WalletRoute'
import AppContextProvider from './components/contexts/AppContextProvider'
import TopNav from './components/sections/TopNav'
import BottomNav from './components/sections/BottomNav'
import Guardians from './components/pages/Guardians'
import { SnackbarProvider } from 'notistack'

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#5c2a72'
    },
    secondary: {
      main: '#ff8633'
    }
  }
})

const useStyles = makeStyles(theme => ({
  mainContent: {
    marginTop: '1rem',
    marginBottom: '4rem'
  }
}))

function App() {
  const classes = useStyles()

  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <TopNav />
        <Container component="main" fixed className={classes.mainContent}>
          <Switch>
            <Route exact path="/" component={GetStarted} />
            <Route exact path="/create-wallet" component={CreateWallet} />
            <Route exact path="/recover-wallet" component={RecoverWallet} />
            <WalletRoute path="/wallet" component={Wallet} />
            <WalletRoute path="/guardians" component={Guardians} />
          </Switch>
        </Container>
        <BottomNav />
      </ThemeProvider>
    </BrowserRouter>
  )
}

const Wrapper = () => {
  return (
    <AppContextProvider>
      <SnackbarProvider maxSnack={1} autoHideDuration={4000}>
        <App />
      </SnackbarProvider>
    </AppContextProvider>
  )
}

export default Wrapper

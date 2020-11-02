import React, { useContext } from 'react'
import { Route, Redirect } from 'react-router-dom'
import { AppContext } from '../contexts/AppContextProvider'

type WalletRouteProps = {
  path: string
  component: React.FC<any>
}

const WalletRoute = ({ path, component }: WalletRouteProps) => {
  const context = useContext(AppContext)

  if (!context.state.wallet) {
    return (
      <Route
        exact
        path={path}
        render={({ location }) => (
          <Redirect
            to={{
              pathname: '/',
              state: { from: location }
            }}
          />
        )}
      />
    )
  } else if (context.state.isRecovering) {
    return (
      <Route
        exact
        path={path}
        render={({ location }) => (
          <Redirect
            to={{
              pathname: '/recover-wallet',
              state: { from: location }
            }}
          />
        )}
      />
    )
  }

  return <Route exact path={path} component={component} />
}

export default WalletRoute

import React from 'react'
import { AppBar, makeStyles, Toolbar, Typography } from '@material-ui/core'
import { Link } from 'react-router-dom'

const useStyles = makeStyles(theme => ({
  title: {
    textDecoration: 'none',
    color: 'white'
  }
}))

const TopNav = () => {
  const classes = useStyles()

  return (
    <AppBar position="static">
      <Toolbar>
        <Link to="/" className={classes.title}>
          <Typography variant="h6">Mochifi</Typography>
        </Link>
      </Toolbar>
    </AppBar>
  )
}

export default TopNav

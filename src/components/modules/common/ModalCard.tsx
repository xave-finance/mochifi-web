import React from 'react'
import { Card, makeStyles } from '@material-ui/core'

const useStyles = makeStyles(() => ({
  wrapper: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    top: 0,
    left: 0
  },
  card: {
    width: '75%',
    maxWidth: 320
  }
}))

const ModalCard: React.FC = ({ children }) => {
  const classes = useStyles()

  return (
    <div className={classes.wrapper}>
      <Card className={classes.card}>{children}</Card>
    </div>
  )
}

export default ModalCard

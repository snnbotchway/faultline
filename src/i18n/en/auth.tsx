import type { ReactNode } from 'react'

// The signed-out screens: sign in, sign up, two-step, reset, and an invitation.
export const auth = {
  email: 'Email',
  password: 'Password',
  newPassword: 'New password',
  // The backend's rule; shown because the person cannot see it otherwise.
  passwordRule: '8 or more characters',
  signIn: 'Sign in',
  createAccount: 'Create account',
  signInInstead: 'Sign in instead',
  backToSignIn: 'Back to sign in',
  useAnotherAccount: 'Use another account',
  forgotPassword: 'Forgot password?',
  continueWith: (provider: string) => `Continue with ${provider}`,
  // `action` phrases complete "Couldn't …".
  signInAction: 'sign you in',
  createAccountAction: 'create your account',

  login: {
    passwordChanged: 'Password changed. Sign in with the new one.',
    socialFailed: "That sign-in didn't go through. Try again, or use your email and password.",
    timedOut: 'Sign-in timed out. Sign in again.',
    providerNoEmail: (provider: string | undefined) => `${provider ?? 'Your provider'} didn't share an email`,
  },

  twoStep: {
    title: 'Two-step verification',
    appOrRecovery: 'Authenticator or recovery code',
    app: 'Authenticator code',
    recovery: 'Recovery code',
    verify: 'Verify',
    checkAction: 'check that code',
    keyFailedOrCode: "That security key didn't work. Try it again, or enter a code.",
    keyFailed: "That security key didn't work. Try it again.",
    waitingForKey: 'Waiting for your security key',
    tryKeyAgain: 'Try the security key again',
    useKey: 'Use a security key',
  },

  signUp: {
    closed: 'Sign-up is closed',
    askAdmin: 'Ask an administrator to invite you.',
  },

  reset: {
    title: 'Reset password',
    sendLink: 'Send reset link',
    sendAction: 'send the reset link',
    noEmail: 'Ask an administrator to reset your password',
    tooMany: 'Too many reset emails',
    checkEmail: 'Check your email',
    onItsWay: (email: ReactNode) => <>If {email} has an account, a reset link is on its way.</>,
    sendAgainIn: 'Send again in',
    sendAgain: 'Send again',
    setNew: 'Set a new password',
    setAction: 'set your password',
    expired: 'This reset link has expired or was already used',
    sendNewLink: 'Send a new link',
    setPassword: 'Set password',
  },

  invite: {
    title: 'Invitation',
    didntLoad: "This invitation didn't load",
    expired: 'This invitation has expired or was already used',
    askForNew: 'Ask whoever invited you to send a new one.',
    invitedAs: 'Invited as',
    alreadyIn: (organization: string) => `You're already in ${organization}`,
    open: (organization: string) => `Open ${organization}`,
    join: (organization: string) => `Join ${organization}`,
    signedInAs: 'Signed in as',
    acceptAction: 'accept the invitation',
    createAndJoin: 'Create account and join',
    signInAndJoin: 'Sign in and join',
    createInstead: 'Create an account instead',
  },
}

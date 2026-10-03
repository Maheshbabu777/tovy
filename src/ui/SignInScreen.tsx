import { useEffect, useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import { Icons } from './icons'
import { supabase } from '../core/db/supabase'
import { describeAuthError, isValidEmail } from '../core/auth/errors'
import { AuthLayout } from './components/AuthLayout'
import { rememberReturn } from './returnTo'
import { Button } from './components/Button'
import { GoogleMark } from './components/GoogleMark'
import { Input } from './components/Input'
import { OtpInput } from './components/OtpInput'
import { useTheme } from './theme'
import { fonts, type } from './tokens'

const RESEND_SECONDS = 30

// Sign in and register are the same two steps (design 11.3 and 11.4): the email, then the 6 digit code sent to it.
// An email that is new gets an account. Google (web only for now) is the other way in.
export function SignInScreen() {
  const { theme } = useTheme()
  const c = theme.colors
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [formError, setFormError] = useState('') // trouble asking for a code (limit, network)
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(0) // seconds until another code may be asked for

  useEffect(() => {
    if (wait <= 0) return
    const timer = setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000)
    return () => clearInterval(timer)
  }, [wait > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  async function sendCode() {
    const address = email.trim().toLowerCase()
    // Validated on submit, the button is never disabled for it (design 7.1, 11.3).
    if (!address) return setEmailError('Add your email address to continue.')
    if (!isValidEmail(address)) return setEmailError('That email looks incomplete. Check for a missing @ or domain.')
    setBusy(true)
    setFormError('')
    const { error } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } })
    setBusy(false)
    if (error) {
      const described = describeAuthError(error, 'send')
      if (described.waitSeconds) setWait(described.waitSeconds)
      if (step === 'email' && !described.waitSeconds && /address does not look right/.test(described.text)) {
        setEmailError(described.text)
      } else {
        setFormError(described.text)
      }
      return
    }
    setEmail(address)
    setCode('')
    setCodeError('')
    setStep('code')
    setWait(RESEND_SECONDS)
  }

  async function verifyCode(token: string) {
    setBusy(true)
    setCodeError('')
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    setBusy(false)
    // On success the session listener in the app switches to the signed in screens.
    if (error) setCodeError(describeAuthError(error, 'verify').text)
  }

  function changeCode(value: string) {
    setCode(value)
    setCodeError('') // typing again clears the error
    if (value.length === 6 && !busy) void verifyCode(value) // the sixth digit sends it
  }

  // Google sign in is for web in this version (a phone needs a dev build, see the auth spec).
  async function signInWithGoogle() {
    rememberReturn()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setFormError(error.message)
  }

  if (step === 'code') {
    return (
      <AuthLayout logo={false}>
        <Pressable
          testID="change-email"
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            setStep('email')
            setCode('')
            setCodeError('')
            setFormError('')
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            alignSelf: 'flex-start',
            marginBottom: 24,
            marginLeft: -4,
          }}
        >
          <Icons.back size={16} color={c.ink6} strokeWidth={1.75} />
          <Text style={[type.bodySMedium, { color: c.ink6 }]}>Back</Text>
        </Pressable>
        <Text style={[type.display, { color: c.text }]}>Check your email</Text>
        <Text testID="code-hint" style={[type.body, { color: c.ink6, marginTop: 12 }]}>
          We sent a 6-digit code to <Text style={{ fontFamily: fonts.semibold, color: c.ink }}>{email}</Text>.
        </Text>
        <View style={{ marginTop: 32 }}>
          <OtpInput testID="code" value={code} onChange={changeCode} error={!!codeError} />
        </View>
        {codeError ? (
          <Text testID="auth-error" accessibilityRole="alert" style={[type.bodyS, { color: c.bad, marginTop: 12 }]}>
            {codeError}
          </Text>
        ) : null}
        <Text style={[type.meta, { color: c.text2, marginTop: 16 }]}>
          The code works once and expires in an hour. Check spam if it does not arrive.
        </Text>
        <Pressable
          testID="resend-code"
          accessibilityRole="button"
          disabled={busy || wait > 0}
          onPress={sendCode}
          style={{ marginTop: 24, alignSelf: 'flex-start' }}
        >
          <Text style={[type.bodySMedium, { color: busy || wait > 0 ? c.ink5 : c.accent }]}>
            {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
          </Text>
        </Pressable>
        {formError ? (
          <Text testID="resend-error" accessibilityRole="alert" style={[type.bodyS, { color: c.bad, marginTop: 12 }]}>
            {formError}
          </Text>
        ) : null}
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      actions={
        <>
          {Platform.OS === 'web' ? (
            <>
              <View>
                <Button
                  testID="google-sign-in"
                  label="Continue with Google"
                  icon={GoogleMark as never}
                  variant="ghost"
                  bordered
                  fullWidth
                  onPress={signInWithGoogle}
                />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: c.ink3 }} />
                <Text style={[type.meta, { color: c.ink5 }]}>or</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: c.ink3 }} />
              </View>
            </>
          ) : null}

          <Input
            testID="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={(v) => {
              setEmail(v)
              setEmailError('') // the message clears as soon as the person types
            }}
            error={emailError}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            onSubmitEditing={sendCode}
          />
          <View style={{ marginTop: 12 }}>
            <Button
              testID="send-code"
              label={busy ? 'Sending' : wait > 0 ? `Wait ${wait}s` : 'Email me a code'}
              fullWidth
              disabled={busy || wait > 0}
              onPress={sendCode}
            />
          </View>
          {formError ? (
            <Text testID="auth-error" accessibilityRole="alert" style={[type.label, { color: c.bad, marginTop: 12 }]}>
              {formError}
            </Text>
          ) : null}
        </>
      }
    >
      <Text style={[type.display, { color: c.text }]}>Your day, in order.</Text>
      <Text style={[type.body, { color: c.text2, marginTop: 12 }]}>
        Tasks and routines that work on this device first and sync everywhere. New or returning, it is the same step.
      </Text>
    </AuthLayout>
  )
}

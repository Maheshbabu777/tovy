import { useEffect, useState } from 'react'
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { supabase } from '../core/db/supabase'
import { describeAuthError, isValidEmail } from '../core/auth/errors'
import { colors, fonts, radius } from './tokens'

const RESEND_SECONDS = 60

// Sign in and register are the same two steps: the email, then the 6 digit code that was sent to it. An email that is
// new gets an account. Google (web only for now) is the other way in.
export function SignInScreen() {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(0) // seconds until another code may be asked for

  useEffect(() => {
    if (wait <= 0) return
    const timer = setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000)
    return () => clearInterval(timer)
  }, [wait > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  async function sendCode() {
    const address = email.trim().toLowerCase()
    if (!isValidEmail(address)) {
      setError('That email address does not look right.')
      return
    }
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } })
    setBusy(false)
    if (error) {
      const described = describeAuthError(error, 'send')
      setError(described.text)
      if (described.waitSeconds) setWait(described.waitSeconds)
      return
    }
    setEmail(address)
    setCode('')
    setStep('code')
    setWait(RESEND_SECONDS)
  }

  async function verifyCode() {
    if (!/^\d{6}$/.test(code)) {
      setError('The code has 6 digits.')
      return
    }
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    setBusy(false)
    // On success the session listener in the app switches to the signed in screen.
    if (error) setError(describeAuthError(error, 'verify').text)
  }

  // Google sign in is for web in this version (a phone needs a dev build, see the auth spec).
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  return (
    <View style={styles.pad}>
      <Image source={require('../../assets/brand/tovy-logo.png')} style={styles.logo} accessibilityLabel="Tovy" />
      <Text style={styles.title}>{step === 'email' ? 'Sign in or create an account' : 'Check your email'}</Text>

      {step === 'email' ? (
        <>
          <TextInput
            testID="email"
            placeholder="you@example.com"
            placeholderTextColor={colors.inkFaint}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            style={styles.input}
            onSubmitEditing={sendCode}
          />
          <Pressable
            testID="send-code"
            onPress={sendCode}
            disabled={busy || wait > 0}
            style={[styles.button, (busy || wait > 0) && styles.disabled]}
          >
            <Text style={styles.buttonText}>{busy ? 'Sending' : wait > 0 ? `Wait ${wait}s` : 'Email me a code'}</Text>
          </Pressable>
          {Platform.OS === 'web' ? (
            <Pressable testID="google-sign-in" onPress={signInWithGoogle} style={styles.secondary}>
              <Text style={styles.secondaryText}>Continue with Google</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <>
          <Text testID="code-hint" style={styles.hint}>
            We sent a 6 digit code to {email}. It can take a minute.
          </Text>
          <TextInput
            testID="code"
            placeholder="000000"
            placeholderTextColor={colors.inkFaint}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            style={[styles.input, styles.codeInput]}
            onSubmitEditing={verifyCode}
          />
          <Pressable
            testID="verify-code"
            onPress={verifyCode}
            disabled={busy}
            style={[styles.button, busy && styles.disabled]}
          >
            <Text style={styles.buttonText}>{busy ? 'Checking' : 'Sign in'}</Text>
          </Pressable>
          <View style={styles.row}>
            <Pressable testID="resend-code" onPress={sendCode} disabled={busy || wait > 0}>
              <Text style={[styles.link, (busy || wait > 0) && styles.disabledText]}>
                {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
              </Text>
            </Pressable>
            <Pressable
              testID="change-email"
              onPress={() => {
                setStep('email')
                setError('')
                setCode('')
              }}
            >
              <Text style={styles.link}>Use a different email</Text>
            </Pressable>
          </View>
        </>
      )}

      {error ? (
        <Text testID="auth-error" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  pad: { padding: 24, gap: 12, maxWidth: 420, width: '100%', alignSelf: 'center' },
  logo: { width: 56, height: 56, resizeMode: 'contain', marginBottom: 8 },
  title: { fontFamily: fonts.sans, fontSize: 20, fontWeight: '600', color: colors.ink },
  hint: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkSoft },
  input: {
    borderWidth: 1,
    borderColor: colors.ring,
    borderRadius: radius.control,
    padding: 12,
    backgroundColor: colors.card,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
  codeInput: { fontFamily: fonts.mono, fontSize: 22, letterSpacing: 6, textAlign: 'center' },
  button: { borderRadius: radius.pill, padding: 12, alignItems: 'center', backgroundColor: colors.accent },
  buttonText: { color: 'white', fontFamily: fonts.sans, fontSize: 14.5, fontWeight: '600' },
  secondary: {
    borderRadius: radius.pill,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.ring,
    backgroundColor: colors.card,
  },
  secondaryText: { color: colors.ink, fontFamily: fonts.sans, fontSize: 14.5, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  link: { fontFamily: fonts.sans, fontSize: 13.5, color: colors.accent },
  disabled: { opacity: 0.55 },
  disabledText: { color: colors.inkFaint },
  error: { color: colors.danger, fontFamily: fonts.sans, fontSize: 13 },
})

import { useState } from 'react'
import { authAPI } from '../../lib/api'
import { LogIn, Shield, AlertCircle, UserPlus } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import GlowButton from '../ui/GlowButton'
import NeonInput from '../ui/NeonInput'

interface LoginProps {
  onLogin: (token: string, role: string) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [useEmail, setUseEmail] = useState(true)
  const [regPassword, setRegPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const response = await authAPI.login({ identifier, password })
      const { access_token, role, user_id, username } = response.data
      localStorage.setItem('userId', user_id.toString())
      localStorage.setItem('username', username)
      localStorage.setItem('showScoringNotice', 'true')
      onLogin(access_token, role)
    } catch (err: any) {
      setLoginError(err.response?.data?.detail || 'Login failed. Please try again.')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')
    if (regPassword !== confirmPassword) {
      setRegError('Passwords do not match')
      return
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters')
      return
    }
    setRegLoading(true)
    try {
      const data = {
        username,
        email: useEmail ? email : null,
        phone: useEmail ? null : phone,
        password: regPassword,
      }
      const response = await authAPI.register(data)
      const { access_token, role, user_id, username: userName } = response.data
      localStorage.setItem('userId', user_id.toString())
      localStorage.setItem('username', userName)
      localStorage.setItem('showScoringNotice', 'true')
      onLogin(access_token, role)
    } catch (err: any) {
      setRegError(err.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-white">
      <div className="relative max-w-5xl mx-auto px-6 py-16">
        <GlowButton
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="md:hidden absolute top-4 right-4 !bg-white !text-black border border-[#D9D9E3] text-xs px-3 py-1.5 shadow"
        >
          {mode === 'login' ? 'JOIN US' : 'SIGN IN'}
        </GlowButton>
        <GlassCard className="overflow-hidden relative min-h-[680px] md:min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className={`p-8 transition-opacity ${mode === 'login' ? 'opacity-100' : 'opacity-40 pointer-events-none'} ${mode === 'login' ? 'block' : 'hidden'} md:block`}>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-[#6E67FF] rounded-full mb-3 shadow-lg">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Sign In</h2>
                <p className="text-sm text-muted-foreground mt-1">Access your account</p>
              </div>
              {loginError && (
                <div className="mb-4 p-3 bg-destructive/20 border border-destructive/30 rounded-2xl flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{loginError}</span>
                </div>
              )}
              <form onSubmit={handleLogin} className="space-y-5">
                <NeonInput id="identifier" label="Email or Phone Number" type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Enter email or phone" required />
                <NeonInput id="password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required />
                <GlowButton type="submit" disabled={loginLoading} className="w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loginLoading ? (<span>Signing in...</span>) : (<><LogIn className="w-5 h-5" /><span>Sign In</span></>)}
                </GlowButton>
              </form>
            </div>
            <div className={`p-8 transition-opacity ${mode === 'register' ? 'opacity-100' : 'opacity-40 pointer-events-none'} ${mode === 'register' ? 'block' : 'hidden'} md:block`}>
              <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-[#6E67FF] rounded-full mb-3 shadow-lg">
                  <UserPlus className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Create Account</h2>
                <p className="text-sm text-muted-foreground mt-1">Join the fraud detection system</p>
              </div>
              {regError && (
                <div className="mb-4 p-3 bg-destructive/20 border border-destructive/30 rounded-2xl flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{regError}</span>
                </div>
              )}
              <form onSubmit={handleRegister} className="space-y-5">
                <NeonInput id="username" label="Username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" required />
                <div className="grid grid-cols-2 gap-3">
                  <GlowButton
                    type="button"
                    onClick={() => setUseEmail(true)}
                    className={`!bg-white !text-black border border-[#D9D9E3] ${useEmail ? 'ring-2 ring-[#7C3AED]' : ''} hover:!bg-[#4C1D95] hover:!text-white transition-colors`}
                  >
                    Email
                  </GlowButton>
                  <GlowButton
                    type="button"
                    onClick={() => setUseEmail(false)}
                    className={`!bg-white !text-black border border-[#D9D9E3] ${!useEmail ? 'ring-2 ring-[#7C3AED]' : ''} hover:!bg-[#4C1D95] hover:!text-white transition-colors`}
                  >
                    Phone
                  </GlowButton>
                </div>
                {useEmail ? (
                  <NeonInput id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
                ) : (
                  <NeonInput id="phone" label="Phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" required />
                )}
                <NeonInput id="regPassword" label="Password" type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="Enter a password" required />
                <NeonInput id="confirmPassword" label="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" required />
                <GlowButton type="submit" disabled={regLoading} className="w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {regLoading ? (<span>Creating Account...</span>) : (<><UserPlus className="w-5 h-5" /><span>Create Account</span></>)}
                </GlowButton>
              </form>
            </div>
          </div>
            <div className={`absolute top-0 left-0 h-full w-1/2 transition-transform duration-500 ease-in-out ${mode === 'login' ? 'translate-x-full' : 'translate-x-0'}`}>
            <div className="h-full flex flex-col items-center justify-center bg-[#F9FAFB] text-foreground p-8 border-r border-[#E5E7EB]">
              <h3 className="text-2xl font-bold mb-2">{mode === 'login' ? 'Join Us' : 'Already Have An Account?'}</h3>
              <p className="text-sm text-muted-foreground mb-6">{mode === 'login' ? 'Create an account to get started' : 'Sign in to continue'}</p>
              {mode === 'login' ? (
                <GlowButton onClick={() => setMode('register')} className="!bg-white !text-black border border-[#D9D9E3] hover:!bg-[#4C1D95] hover:!text-white transition-colors">Create Account</GlowButton>
              ) : (
                <GlowButton onClick={() => setMode('login')} className="!bg-white !text-black border border-[#D9D9E3] hover:!bg-[#4C1D95] hover:!text-white transition-colors">Sign In</GlowButton>
              )}
            </div>
          </div>
        </GlassCard>
        <GlassCard className="mt-8">
          <p className="text-xs font-medium text-foreground mb-2">Test Accounts:</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Admin: admin@fraud-detect.com / Admin@123</p>
            <p>Supervisor: supervisor@frauddetect.com / Super@123</p>
            <p>User: user@test.com / User@123</p>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

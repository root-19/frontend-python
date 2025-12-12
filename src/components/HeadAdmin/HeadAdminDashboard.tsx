import { useState, useEffect, useRef } from 'react'
import { adminAPI, reviewAPI, API_SERVER_URL } from '../../lib/api'
import { LayoutDashboard, FileText, Users, LogOut, Shield, ShieldCheck, Bell, Filter } from 'lucide-react'
import Card from '../ui/Card'
import GlassCard from '../ui/GlassCard'
import GlowButton from '../ui/GlowButton'
import NeonBadge from '../ui/NeonBadge'
import NeonChart from '../ui/NeonChart'
import Modal from '../ui/Modal'
import { createPortal } from 'react-dom'
import SideNotification from '../ui/SideNotification'

interface HeadAdminDashboardProps {
  onLogout: () => void
}


export default function HeadAdminDashboard({ onLogout }: HeadAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'uploads' | 'users' | 'appeals' | 'requests' | 'archived' | 'upload_archives'>('dashboard')
  const [stats, setStats] = useState<any>(null)
  const [uploads, setUploads] = useState<any[]>([])
  const [uploadsQuery, setUploadsQuery] = useState('')
  const [uploadsUserFilter, setUploadsUserFilter] = useState<string>('all')
  const [showUploadsUserDropdown, setShowUploadsUserDropdown] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [appeals, setAppeals] = useState<any[]>([])
  const [adminRequests, setAdminRequests] = useState<any[]>([])
  const [adminRequestHistory, setAdminRequestHistory] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [appealsQuery, setAppealsQuery] = useState('')
  const [appealsStatus, setAppealsStatus] = useState<'all'|'approved'|'rejected'|'pending'>('all')
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState<'all'|'user'|'supervisor'|'admin'|'head_admin'>('all')
  const username = localStorage.getItem('username') || 'Admin'
  const [undoModalAppealId, setUndoModalAppealId] = useState<number | null>(null)
  const [undoNotice, setUndoNotice] = useState<string>('')
  const [showNotificationsPanel, setShowNotificationsPanel] = useState<boolean>(false)
  const [updatesCount, setUpdatesCount] = useState<number>(0)
  const [newUpdates, setNewUpdates] = useState<any[]>([])
  const [oldUpdates, setOldUpdates] = useState<any[]>([])
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null)
  const [sideOpen, setSideOpen] = useState(false)
  const [sideTitle, setSideTitle] = useState('')
  const [sideSender, setSideSender] = useState('')
  const [sideTime, setSideTime] = useState('')
  const [sideMessage, setSideMessage] = useState('')
  const [sideVariant, setSideVariant] = useState<'success'|'error'|'warning'|'info'>('info')
  const [openUserAppeals, setOpenUserAppeals] = useState<{ key: string; list: any[] } | null>(null)
  const notifContainerRef = useRef<HTMLDivElement | null>(null)
  const notifButtonRef = useRef<HTMLButtonElement | null>(null)
  const notifDropdownRef = useRef<HTMLDivElement | null>(null)
  const uploadsUserDropdownRef = useRef<HTMLDivElement | null>(null)
  const archiveUserDropdownRef = useRef<HTMLDivElement | null>(null)

  // Upload Archives state
  const [archiveYears, setArchiveYears] = useState<any[]>([])
  const [selectedArchiveYear, setSelectedArchiveYear] = useState<number | null>(null)
  const [archiveUploads, setArchiveUploads] = useState<any[]>([])
  const [archiveQuery, setArchiveQuery] = useState('')
  const [archiveUserFilter, setArchiveUserFilter] = useState<string>('all')
  const [showArchiveUserDropdown, setShowArchiveUserDropdown] = useState(false)
  const [archiveAccessRequests, setArchiveAccessRequests] = useState<any[]>([])

  const [newUserUsername, setNewUserUsername] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPhone, setNewUserPhone] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState<'supervisor'|'manager'>('supervisor')
  const [creatingUser, setCreatingUser] = useState(false)

  const notify = (opts: { title: string; message: string; variant: 'success'|'error'|'warning'|'info'; requireConfirm?: boolean; onAction?: () => void }) => {
    setSideTitle(opts.title)
    setSideSender('System')
    setSideTime(new Date().toLocaleString())
    setSideMessage(opts.message)
    setSideVariant(opts.variant)
    ;(notify as any)._actionLabel = opts.requireConfirm ? 'OK' : undefined
    ;(notify as any)._onAction = opts.onAction
    setSideOpen(true)
  }

  useEffect(() => {
    loadStats()
    loadUploads()
    loadUsers()
    loadAppeals()
    loadAdminRequests()
    loadAdminRequestHistory()
    loadArchiveYears()
    loadArchiveAccessRequests()
  }, [])

  useEffect(() => {
    if (!showNotificationsPanel) return
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      const container = notifContainerRef.current
      const dropdown = notifDropdownRef.current
      const outsideContainer = !container || !container.contains(target)
      const outsideDropdown = !dropdown || !dropdown.contains(target)
      if (outsideContainer && outsideDropdown) {
        setShowNotificationsPanel(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowNotificationsPanel(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [showNotificationsPanel])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      const container = uploadsUserDropdownRef.current
      if (container && !container.contains(target)) setShowUploadsUserDropdown(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
    }
  }, [])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      const container = archiveUserDropdownRef.current
      if (container && !container.contains(target)) setShowArchiveUserDropdown(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
    }
  }, [])

  useEffect(() => {
    if (showNotificationsPanel && notifButtonRef.current) {
      const rect = notifButtonRef.current.getBoundingClientRect()
      const right = Math.max(8, window.innerWidth - rect.right)
      const top = rect.bottom + 8
      setDropdownPos({ top, right })
    }
  }, [showNotificationsPanel])

  useEffect(() => {
    if (activeTab === 'appeals') {
      loadAppeals()
      const t = setInterval(loadAppeals, 15000)
      return () => clearInterval(t)
    }
    if (activeTab === 'requests') {
      loadAdminRequests()
      const t = setInterval(loadAdminRequests, 15000)
      return () => clearInterval(t)
    }
    if (activeTab === 'archived') {
      loadAdminRequestHistory()
      const t = setInterval(loadAdminRequestHistory, 30000)
      return () => clearInterval(t)
    }
  }, [activeTab])

  useEffect(() => {
    const seenStr = localStorage.getItem('admin_notif_seen_requests') || '{}'
    let seen: Record<string, string> = {}
    try { seen = JSON.parse(seenStr) } catch {}
    const items = Array.isArray(adminRequests) ? adminRequests.map((r: any) => ({
      id: `rq_${r.request_id}`,
      status: 'pending',
      title: 'Undo Requested',
      message: String(r.reason || ''),
      sender: String(r.supervisor_name || 'Supervisor'),
      timestamp: new Date(r.created_at).toLocaleString(),
      seenKey: String(r.request_id),
      seenVal: String(r.created_at || '')
    })) : []
    const newList = items.filter((it) => String(seen[it.seenKey] || '') !== it.seenVal)
    const oldList = items.filter((it) => !newList.some((n) => n.id === it.id))
    const sortByTimeDesc = (a: any, b: any) => {
      const ta = Date.parse(a.timestamp)
      const tb = Date.parse(b.timestamp)
      return tb - ta
    }
    const sortedNew = newList.sort(sortByTimeDesc)
    setUpdatesCount(sortedNew.length)
    setNewUpdates(sortedNew.slice(0, 5))
    setOldUpdates(oldList.sort(sortByTimeDesc).slice(0, 5))
    if (sortedNew.length > 0) {
      const n = sortedNew[0]
      setSideTitle(n.title)
      setSideSender(n.sender)
      setSideTime(n.timestamp)
      setSideMessage(n.message)
      setSideOpen(true)
    }
  }, [adminRequests])

  const markAllAsRead = () => {
    try {
      const seen: Record<string, string> = {}
      for (const r of (adminRequests || [])) {
        seen[String(r.request_id)] = String(r.created_at || '')
      }
      localStorage.setItem('admin_notif_seen_requests', JSON.stringify(seen))
    } catch {}
    setUpdatesCount(0)
  }

  const handleNotificationsClick = () => {
    setShowNotificationsPanel((prev) => {
      const next = !prev
      if (next) markAllAsRead()
      return next
    })
  }

  const loadStats = async () => {
    setLoadingStats(true)
    setStatsError(null)
    try {
      const response = await adminAPI.getDashboardStats()
      setStats(response.data)
    } catch (error: any) {
      console.error('Failed to load stats:', error)
      setStatsError(error?.response?.data?.detail || 'Unable to load overview')
    } finally {
      setLoadingStats(false)
    }
  }

  const loadUploads = async () => {
    try {
      const response = await adminAPI.getAllUploads()
      setUploads(response.data)
    } catch (error) {
      console.error('Failed to load uploads:', error)
    }
  }

  const loadArchiveYears = async () => {
    try {
      const resp = await adminAPI.getArchiveYears()
      setArchiveYears(resp.data)
    } catch (err) {
      console.error('Failed to load archive years:', err)
    }
  }

  const loadArchiveUploads = async (year: number) => {
    try {
      const resp = await adminAPI.getArchiveByYear(year)
      setArchiveUploads(resp.data)
    } catch (err) {
      console.error('Failed to load archive uploads:', err)
    }
  }

  const loadArchiveAccessRequests = async () => {
    try {
      const resp = await reviewAPI.getArchiveAccessRequests()
      setArchiveAccessRequests(resp.data)
    } catch (err) {
      console.error('Failed to load archive access requests:', err)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await adminAPI.getAllUsers()
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  const handleCreateUser = async () => {
    if (!newUserUsername || !newUserPassword || (!newUserEmail && !newUserPhone)) {
      notify({ title: 'Missing Fields', message: 'Username, password, and either email or phone are required.', variant: 'warning' })
      return
    }
    setCreatingUser(true)
    try {
      await adminAPI.createUser({
        username: newUserUsername,
        password: newUserPassword,
        email: newUserEmail || undefined,
        phone: newUserPhone || undefined,
        role: newUserRole,
      })
      notify({ title: 'User Created', message: 'Account created successfully.', variant: 'success' })
      setNewUserUsername('')
      setNewUserEmail('')
      setNewUserPhone('')
      setNewUserPassword('')
      setNewUserRole('supervisor')
      await loadUsers()
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to create user'
      notify({ title: 'Create Failed', message: msg, variant: 'error' })
    } finally {
      setCreatingUser(false)
    }
  }

  const loadAppeals = async () => {
    try {
      const response = await adminAPI.getAllAppeals()
      setAppeals(response.data)
    } catch (error) {
      console.error('Failed to load appeals:', error)
    }
  }

  const loadAdminRequests = async () => {
    try {
      const response = await reviewAPI.getAdminRequests()
      setAdminRequests(response.data)
    } catch (error) {
      console.error('Failed to load admin requests:', error)
    }
  }
  const loadAdminRequestHistory = async () => {
    try {
      const response = await reviewAPI.getAdminRequestHistory()
      setAdminRequestHistory(response.data)
    } catch (error) {
      console.error('Failed to load admin request history:', error)
    }
  }

  const chartData = stats ? [
    { name: 'Valid', value: stats.valid_count, color: '#22c55e' },
    { name: 'Tampered', value: stats.tampered_count, color: '#ef4444' },
    { name: 'Generated', value: stats.generated_count, color: '#f59e0b' },
    { name: 'Pending', value: stats.pending_review_count, color: '#6366f1' },
  ] : []

  const appealsGroups = Object.entries(
    appeals.reduce((acc: Record<string, any[]>, a: any) => {
      const key = String(a.user_id || a.username || 'unknown')
      acc[key] = acc[key] || []
      acc[key].push(a)
      return acc
    }, {})
  )
  const filteredAppealsGroups = appealsGroups.filter(([, list]) => {
    const name = (list[0]?.username || 'Unknown User').toLowerCase()
    const qOk = !appealsQuery || name.includes(appealsQuery.toLowerCase())
    const sOk = appealsStatus === 'all' || list.some((a: any) => a.status === appealsStatus)
    return qOk && sOk
  })

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1E3E62] text-white flex items-center justify-center shadow-xl ring-2 ring-[#1E3E62]/30">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Head Admin Dashboard</h1>
              <p className="text-sm text-foreground">Welcome, {username} (Full Access)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={notifContainerRef}>
              <button
                onClick={handleNotificationsClick}
                className="relative w-10 h-10 rounded-full bg-gradient-to-br from-black via-[#1A1A1F] to-[#A259FF] hover:opacity-90 transition-opacity flex items-center justify-center shadow-lg"
                aria-label="Notifications"
                ref={notifButtonRef}
              >
                <Bell className="w-5 h-5 text-white" />
                {updatesCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] px-1 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold text-center">
                    {updatesCount}
                  </span>
                )}
              </button>
              {showNotificationsPanel && dropdownPos && typeof document !== 'undefined' && createPortal(
                (
                  <div ref={notifDropdownRef} className="fixed z-[9999]" style={{ top: dropdownPos.top, right: dropdownPos.right }}>
                    <div id="notification-container" className="w-[520px] max-h-[540px] bg-white rounded-xl shadow-2xl border border-[#1E3E62]/20 ring-1 ring-[#1E3E62]/10 overflow-y-auto">
                      <div className="px-4 py-3 bg-[#F8FAFD] border-b border-[#1E3E62]/10 flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#1E3E62]">{(newUpdates.length + oldUpdates.length) === 0 ? 'Notifications' : 'Updates'}</p>
                        <div className="flex items-center gap-2"></div>
                      </div>
                      <ul className="p-3 space-y-2">
                        {(() => {
                          const all: any[] = [...newUpdates, ...oldUpdates]
                          const now = new Date()
                          const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                          const startYesterday = new Date(startToday)
                          startYesterday.setDate(startYesterday.getDate() - 1)
                          const toDate = (it: any) => new Date(it.timestamp)
                          const today = all.filter((it) => toDate(it) >= startToday)
                          const yesterday = all.filter((it) => toDate(it) >= startYesterday && toDate(it) < startToday)
                          const older = all.filter((it) => toDate(it) < startYesterday)
                          const renderItem = (it: any) => {
                            const statusCls = 'text-gray-700'
                            const isNew = newUpdates.some((n:any) => n.id === it.id)
                            const onOpen = () => {
                              setShowNotificationsPanel(false)
                              setActiveTab('requests')
                            }
                            return (
                              <li key={it.id} className={`p-4 rounded hover:bg-[#F9FBFF] cursor-pointer flex items-start gap-4 ${isNew ? 'border-l-4 border-[#1E3E62] bg-[#F8FAFD]' : ''}`} onClick={onOpen}>
                                <div className="text-xs text-muted-foreground min-w-[130px]">
                                  {it.timestamp}
                                </div>
                                <div className="flex-1">
                                  <p className={`text-sm font-semibold ${statusCls}`}>{it.title}</p>
                                  <p className="text-xs text-muted-foreground">{it.sender}</p>
                                  <p className="text-sm text-gray-700 line-clamp-2">{it.message}</p>
                                </div>
                              </li>
                            )
                          }
                          return (
                            <>
                              {today.length > 0 && (
                                <li className="px-1">
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Today</p>
                                  <ul className="space-y-2">
                                    {today.map((it) => renderItem(it))}
                                  </ul>
                                </li>
                              )}
                              {yesterday.length > 0 && (
                                <li className="px-1">
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Yesterday</p>
                                  <ul className="space-y-2">
                                    {yesterday.map((it) => renderItem(it))}
                                  </ul>
                                </li>
                              )}
                              {older.length > 0 && (() => {
                                const byDate: Record<string, any[]> = {}
                                for (const it of older) {
                                  const dt = toDate(it)
                                  const key = dt.toLocaleDateString()
                                  byDate[key] = byDate[key] || []
                                  byDate[key].push(it)
                                }
                                return (
                                  <>
                                    {Object.entries(byDate).sort((a,b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()).map(([dateStr, list]) => (
                                      <li key={dateStr} className="px-1">
                                        <p className="text-xs font-semibold text-gray-700 mb-1">{dateStr}</p>
                                        <ul className="space-y-2">
                                          {list.map((it) => renderItem(it))}
                                        </ul>
                                      </li>
                                    ))}
                                  </>
                                )
                              })()}
                              {(today.length + yesterday.length + older.length) === 0 && (
                                <li className="text-sm text-gray-600">No notifications</li>
                              )}
                            </>
                          )
                        })()}
                      </ul>
                    </div>
                  </div>
                ),
                document.body
              )}
            </div>
            <GlowButton
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-[#6E67FF]/40 bg-gradient-to-br from-black via-[#1A1A1F] to-[#6E67FF] text-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </GlowButton>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`relative group px-4 py-2 font-medium transition-colors ${
              activeTab === 'dashboard' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:-translate-y-0.5 group-hover:opacity-90" />
              <span>Overview</span>
            </div>
            <div className={`absolute left-0 right-0 -bottom-1 h-0.5 ${
              activeTab === 'dashboard' ? 'bg-[#3B82F6]' : 'bg-[#3B82F6] w-0 group-hover:w-full transition-all duration-300 ease-in-out'
            }`}></div>
          </button>
          <button
            onClick={() => setActiveTab('uploads')}
            className={`relative group px-4 py-2 font-medium transition-colors ${
              activeTab === 'uploads' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:-translate-y-0.5 group-hover:opacity-90" />
              <span>All Uploads</span>
            </div>
            <div className={`absolute left-0 right-0 -bottom-1 h-0.5 ${
              activeTab === 'uploads' ? 'bg-[#3B82F6]' : 'bg-[#3B82F6] w-0 group-hover:w-full transition-all duration-300 ease-in-out'
            }`}></div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`relative group px-4 py-2 font-medium transition-colors ${
              activeTab === 'users' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:-translate-y-0.5 group-hover:opacity-90" />
              <span>Users</span>
            </div>
            <div className={`absolute left-0 right-0 -bottom-1 h-0.5 ${
              activeTab === 'users' ? 'bg-[#3B82F6]' : 'bg-[#3B82F6] w-0 group-hover:w-full transition-all duration-300 ease-in-out'
            }`}></div>
          </button>
          <button
            onClick={() => setActiveTab('appeals')}
            className={`relative group px-4 py-2 font-medium transition-colors ${
              activeTab === 'appeals' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:-translate-y-0.5 group-hover:opacity-90" />
              <span>Appeals</span>
            </div>
            <div className={`absolute left-0 right-0 -bottom-1 h-0.5 ${
              activeTab === 'appeals' ? 'bg-[#3B82F6]' : 'bg-[#3B82F6] w-0 group-hover:w-full transition-all duration-300 ease-in-out'
            }`}></div>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`relative group px-4 py-2 font-medium transition-colors ${
              activeTab === 'requests' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:-translate-y-0.5 group-hover:opacity-90" />
              <span>Supervisor Requests</span>
            </div>
            {adminRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] px-1 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold text-center">
                {adminRequests.length}
              </span>
            )}
            <div className={`absolute left-0 right-0 -bottom-1 h-0.5 ${
              activeTab === 'requests' ? 'bg-[#3B82F6]' : 'bg-[#3B82F6] w-0 group-hover:w-full transition-all duration-300 ease-in-out'
            }`}></div>
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`relative group px-4 py-2 font-medium transition-colors ${
              activeTab === 'archived' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:-translate-y-0.5 group-hover:opacity-90" />
              <span>Archieved Requests</span>
            </div>
            <div className={`absolute left-0 right-0 -bottom-1 h-0.5 ${
              activeTab === 'archived' ? 'bg-[#3B82F6]' : 'bg-[#3B82F6] w-0 group-hover:w-full transition-all duration-300 ease-in-out'
            }`}></div>
          </button>
          <button
            onClick={() => setActiveTab('upload_archives')}
            className={`relative group px-4 py-2 font-medium transition-colors ${
              activeTab === 'upload_archives' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:-translate-y-0.5 group-hover:opacity-90" />
              <span>Data Archives</span>
            </div>
            <div className={`absolute left-0 right-0 -bottom-1 h-0.5 ${
              activeTab === 'upload_archives' ? 'bg-[#3B82F6]' : 'bg-[#3B82F6] w-0 group-hover:w-full transition-all duration-300 ease-in-out'
            }`}></div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        {activeTab === 'dashboard' && (
          loadingStats ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="rounded-2xl bg-panel backdrop-blur-md border border-white/10 p-6 h-28 animate-pulse" />
                <div className="rounded-2xl bg-panel backdrop-blur-md border border-white/10 p-6 h-28 animate-pulse" />
                <div className="rounded-2xl bg-panel backdrop-blur-md border border-white/10 p-6 h-28 animate-pulse" />
                <div className="rounded-2xl bg-panel backdrop-blur-md border border-white/10 p-6 h-28 animate-pulse" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl bg-panel backdrop-blur-md border border-white/10 p-6 h-80 animate-pulse" />
                <div className="rounded-2xl bg-panel backdrop-blur-md border border-white/10 p-6 h-80 animate-pulse" />
              </div>
            </div>
          ) : stats ? (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">Total Uploads</p>
                    <p className="text-3xl font-bold text-foreground mt-2">{stats.total_uploads}</p>
                  </div>
                  <FileText className="w-12 h-12 text-accent opacity-40" />
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">Total Users</p>
                    <p className="text-3xl font-bold text-foreground mt-2">{stats.total_users}</p>
                  </div>
                  <Users className="w-12 h-12 text-accent opacity-40" />
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">Fraud Rate</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">
                      {(stats.fraud_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <Shield className="w-12 h-12 text-destructive opacity-40" />
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">Pending Appeals</p>
                    <p className="text-3xl font-bold text-foreground mt-2">{stats.pending_appeals}</p>
                  </div>
                  <FileText className="w-12 h-12 text-warning opacity-40" />
                </div>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Status Distribution">
                <NeonChart type="pie" series={(chartData || []).map((d:any) => d.value)} options={{ labels: (chartData || []).map((d:any) => d.name), colors: ['#778873','#A1BC98','#D2DCB6','#F1F3E0'] }} height={300} />
              </Card>

              <Card title="Status Breakdown">
                <NeonChart type="bar" series={[{ name: 'Count', data: (chartData || []).map((d:any) => d.value) }]} options={{ xaxis: { categories: (chartData || []).map((d:any) => d.name) } }} height={300} />
              </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GlassCard>
                <h4 className="text-sm font-medium text-foreground mb-2">Valid Payments</h4>
                <p className="text-2xl font-bold text-green-600">{stats.valid_count}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {stats.total_uploads > 0 ? ((stats.valid_count / stats.total_uploads) * 100).toFixed(1) : 0}% of total
                </p>
              </GlassCard>

              <GlassCard>
                <h4 className="text-sm font-medium text-foreground mb-2">Tampered</h4>
                <p className="text-2xl font-bold text-red-600">{stats.tampered_count}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {stats.total_uploads > 0 ? ((stats.tampered_count / stats.total_uploads) * 100).toFixed(1) : 0}% of total
                </p>
              </GlassCard>

              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-sm font-medium text-foreground mb-2">AI Generated</h4>
                <p className="text-2xl font-bold text-orange-600">{stats.generated_count}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {stats.total_uploads > 0 ? ((stats.generated_count / stats.total_uploads) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
            </div>
          </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-destructive">{statsError || 'Overview not available'}</p>
            </div>
          )
        )}

        {activeTab === 'uploads' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground mb-2">Full History</h2>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
              <input
                value={uploadsQuery}
                onChange={(e) => setUploadsQuery(e.target.value)}
                placeholder="Search user or reference"
                className="w-full sm:w-1/2 p-3 border border-[#D9D9E3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6E67FF]"
              />
              <div className="relative" ref={uploadsUserDropdownRef}>
                <button
                  onClick={() => setShowUploadsUserDropdown((p) => !p)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-black bg-white hover:bg-[#E5E7EB] text-sm"
                >
                  <Filter className="w-4 h-4" />
                  <span>{uploadsUserFilter === 'all' ? 'All Users' : uploadsUserFilter}</span>
                </button>
                {showUploadsUserDropdown && (
                  <div className="absolute right-0 z-50 mt-2 w-52 bg-white border border-[#D9D9E3] rounded-md shadow-lg">
                    <ul className="py-1 max-h-64 overflow-auto">
                      {(() => {
                        const users = Array.from(new Set((uploads || []).map((u:any) => String(u.username || 'Unknown'))))
                        const items = ['all', ...users]
                        return items.map((u) => (
                          <li key={u}>
                            <button
                              onClick={() => { setUploadsUserFilter(u); setShowUploadsUserDropdown(false) }}
                              className="w-full text-left px-3 py-2 hover:bg-[#F3F4F6] text-sm"
                            >
                              {u === 'all' ? 'All Users' : u}
                            </button>
                          </li>
                        ))
                      })()}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            {uploads.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No uploads found</p>
              </GlassCard>
            ) : (
              <div className="rounded-2xl bg-panel backdrop-blur-md border border-white/10 shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#151519]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Image
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Platform
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Anomaly Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E1E26]">
                      {(uploads || [])
                        .filter((u:any) => uploadsUserFilter === 'all' || String(u.username||'') === uploadsUserFilter)
                        .filter((u:any) => !uploadsQuery || String(u.username||'').toLowerCase().includes(uploadsQuery.toLowerCase()) || String(u.reference_number||'').toLowerCase().includes(uploadsQuery.toLowerCase()))
                        .map((upload) => (
                        <tr key={upload.upload_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {upload.upload_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-foreground">{upload.username}</div>
                            <div className="text-sm text-muted-foreground">{upload.user_email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {upload.image_url ? (
                              <a
                                href={`${API_SERVER_URL}${upload.image_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                View Image
                              </a>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-foreground capitalize">{upload.platform}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-foreground">{upload.amount || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <NeonBadge intent={
                              upload.status === 'valid' ? 'success' :
                              upload.status === 'tampered' ? 'destructive' :
                              upload.status === 'generated' ? 'warning' : 'info'
                            }>
                              {upload.status.replace('_', ' ')}
                            </NeonBadge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${
                              upload.anomaly_score > 0.7 ? 'text-red-600' :
                              upload.anomaly_score > 0.4 ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {(upload.anomaly_score * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {new Date(upload.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'upload_archives' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Upload Archives</h2>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-900 text-sm">Pending Archive Access Requests</p>
                <button onClick={loadArchiveAccessRequests} className="text-xs px-3 py-1.5 rounded-md border border-[#1E3E62]/30 bg-white hover:bg-[#F3F4F6]">Refresh</button>
              </div>
              {archiveAccessRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending requests</p>
              ) : (
                <div className="space-y-2">
                  {archiveAccessRequests.map((r:any) => (
                    <div key={r.request_id} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="text-sm">
                        <p className="font-medium text-foreground">{r.supervisor_name || 'Supervisor'}</p>
                        <p className="text-muted-foreground">Year: {r.year}</p>
                        {r.reason && <p className="text-muted-foreground">Reason: {r.reason}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => { try { await reviewAPI.resolveArchiveAccessRequest(r.request_id, true); loadArchiveAccessRequests(); notify({ title: 'Access Granted', message: `Supervisor granted read-only access to ${r.year}`, variant: 'success' }) } catch { notify({ title: 'Failed', message: 'Approval failed', variant: 'error' }) } }}
                          className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                        >Approve</button>
                        <button
                          onClick={async () => { try { await reviewAPI.resolveArchiveAccessRequest(r.request_id, false); loadArchiveAccessRequests(); notify({ title: 'Request Rejected', message: 'Archive access rejected', variant: 'warning' }) } catch { notify({ title: 'Failed', message: 'Rejection failed', variant: 'error' }) } }}
                          className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                        >Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Archived Years</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {archiveYears.length === 0 ? (
                  <GlassCard className="p-6 text-center"><p className="text-sm text-muted-foreground">No archives</p></GlassCard>
                ) : (
                  archiveYears.map((y:any) => (
                    <button key={y.year} onClick={() => { setSelectedArchiveYear(y.year); loadArchiveUploads(y.year) }} className="bg-white rounded-xl shadow hover:shadow-md border border-[#E5E7EB] p-5 text-left transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-7 bg-[#F3F4F6] border border-[#E5E7EB] rounded-t-md" aria-hidden="true"></div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{y.label_start} – {y.label_end}</p>
                          <p className="text-xs text-muted-foreground">{y.count} uploads</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {selectedArchiveYear && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-2">
                  <h3 className="text-lg font-semibold text-foreground">Archive: {selectedArchiveYear}</h3>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <input
                      value={archiveQuery}
                      onChange={(e) => setArchiveQuery(e.target.value)}
                      placeholder="Search user or reference"
                      className="w-full sm:w-64 min-w-0 max-w-full p-2 border border-[#D9D9E3] rounded text-sm"
                    />
                    <div className="relative" ref={archiveUserDropdownRef}>
                      <button
                        onClick={() => setShowArchiveUserDropdown((p) => !p)}
                        className="flex items-center gap-2 px-3 py-2 rounded-md border border-black bg-white hover:bg-[#E5E7EB] text-sm"
                      >
                        <Filter className="w-4 h-4" />
                        <span>{archiveUserFilter === 'all' ? 'All Users' : archiveUserFilter}</span>
                      </button>
                      {showArchiveUserDropdown && (
                        <div className="absolute right-0 z-50 mt-2 w-52 bg-white border border-[#D9D9E3] rounded-md shadow-lg">
                          <ul className="py-1 max-h-64 overflow-auto">
                            {(() => {
                              const users = Array.from(new Set((archiveUploads || []).map((u:any) => String(u.username || 'Unknown'))))
                              const items = ['all', ...users]
                              return items.map((u) => (
                                <li key={u}>
                                  <button
                                    onClick={() => { setArchiveUserFilter(u); setShowArchiveUserDropdown(false) }}
                                    className="w-full text-left px-3 py-2 hover:bg-[#F3F4F6] text-sm"
                                  >
                                    {u === 'all' ? 'All Users' : u}
                                  </button>
                                </li>
                              ))
                            })()}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-panel backdrop-blur-md border border-white/10 shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#151519]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Image</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Platform</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Confidence</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E1E26]">
                        {(archiveUploads || [])
                          .filter((u:any) => archiveUserFilter === 'all' || String(u.username||'') === archiveUserFilter)
                          .filter((u:any) => !archiveQuery || String(u.username||'').toLowerCase().includes(archiveQuery.toLowerCase()) || String(u.reference_number||'').toLowerCase().includes(archiveQuery.toLowerCase()))
                          .map((upload:any) => (
                          <tr key={upload.upload_id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-foreground">{upload.username}</div>
                              <div className="text-sm text-muted-foreground">{upload.user_email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {upload.image_url ? (
                                <a href={`${API_SERVER_URL}${upload.image_url}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View Image</a>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm text-foreground capitalize">{upload.platform}</span></td>
                            <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm text-foreground">{upload.amount || 'N/A'}</span></td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <NeonBadge intent={
                                upload.status === 'valid' ? 'success' :
                                upload.status === 'tampered' ? 'destructive' :
                                upload.status === 'generated' ? 'warning' : 'info'
                              }>
                                {upload.status.replace('_', ' ')}
                              </NeonBadge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm text-foreground">{(upload.confidence_score * 100).toFixed(1)}%</span></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{new Date(upload.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground mb-6">All Users</h2>
            <GlassCard title="Create Supervisor/Manager" subtitle="Head Admin can create elevated accounts">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Username</label>
                  <input value={newUserUsername} onChange={(e)=>setNewUserUsername(e.target.value)} placeholder="Username" className="w-full px-4 py-3 rounded-2xl bg-white text-foreground border border-[#D9D9E3] focus:outline-none focus:ring-2 focus:ring-[#6E67FF]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Password</label>
                  <input type="password" value={newUserPassword} onChange={(e)=>setNewUserPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 rounded-2xl bg-white text-foreground border border-[#D9D9E3] focus:outline-none focus:ring-2 focus:ring-[#6E67FF]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <input value={newUserEmail} onChange={(e)=>setNewUserEmail(e.target.value)} placeholder="email@example.com" className="w-full px-4 py-3 rounded-2xl bg-white text-foreground border border-[#D9D9E3] focus:outline-none focus:ring-2 focus:ring-[#6E67FF]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Phone</label>
                  <input value={newUserPhone} onChange={(e)=>setNewUserPhone(e.target.value)} placeholder="Optional" className="w-full px-4 py-3 rounded-2xl bg-white text-foreground border border-[#D9D9E3] focus:outline-none focus:ring-2 focus:ring-[#6E67FF]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Role</label>
                  <select value={newUserRole} onChange={(e)=>setNewUserRole(e.target.value as any)} className="w-full px-4 py-3 rounded-2xl bg-white text-foreground border border-[#D9D9E3] focus:outline-none focus:ring-2 focus:ring-[#6E67FF]">
                    <option value="supervisor">Supervisor</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <GlowButton onClick={handleCreateUser} disabled={creatingUser}>
                  {creatingUser ? 'Creating...' : 'Create Account'}
                </GlowButton>
              </div>
            </GlassCard>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search"
                className="w-full sm:w-1/2 p-3 border border-[#D9D9E3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6E67FF]"
              />
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value as any)}
                className="w-full sm:w-40 p-3 border border-[#D9D9E3] rounded-lg text-sm bg-white"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
                <option value="head_admin">Head Admin</option>
              </select>
            </div>
            {users.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No users found</p>
              </GlassCard>
            ) : (
              <div className="rounded-2xl bg-panel backdrop-blur-md border border-white/10 shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#151519]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Username
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Email / Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Joined
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E1E26]">
                      {users
                        .filter((u) => !userSearch || String(u.username || '').toLowerCase().includes(userSearch.toLowerCase()))
                        .filter((u) => userRoleFilter === 'all' || u.role === userRoleFilter)
                        .map((user) => (
                        <tr key={user.user_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {user.user_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-foreground">{user.username}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-foreground">{user.email || user.phone}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                          <NeonBadge intent={
                              (user.role === 'admin' || user.role === 'head_admin') ? 'admin' :
                              user.role === 'supervisor' ? 'success' : 'warning'
                            }>
                              {user.role.replace('_', ' ')}
                            </NeonBadge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'appeals' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground mb-6">All Appeals</h2>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
              <input
                value={appealsQuery}
                onChange={(e) => setAppealsQuery(e.target.value)}
                placeholder="Search user"
                className="w-full sm:w-1/2 p-3 border border-[#D9D9E3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6E67FF]"
              />
              <select
                value={appealsStatus}
                onChange={(e) => setAppealsStatus(e.target.value as any)}
                className="w-full sm:w-40 p-3 border border-[#D9D9E3] rounded-lg text-sm bg-white"
              >
                <option value="all">All</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            {/* Pending Supervisor Requests moved to 'Supervisor Requests' tab */}

            {openUserAppeals && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-foreground">{String(openUserAppeals.list[0]?.username || 'User')}</p>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[#F3F4F6] text-muted-foreground">{openUserAppeals.list.length} appeals</span>
                  </div>
                  <button
                    onClick={() => setOpenUserAppeals(null)}
                    className="text-xs px-4 py-2 rounded-md border border-[#6E67FF]/40 bg-gradient-to-br from-black via-[#1A1A1F] to-[#6E67FF] text-white shadow-sm transition-all duration-200 transform hover:scale-[1.03] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E67FF]"
                  >Back</button>
                </div>
                <div className="space-y-3">
                  {openUserAppeals.list
                    .filter((a:any) => appealsStatus === 'all' || a.status === appealsStatus)
                    .map((a:any) => (
                      <div key={a.appeal_id} className="bg-white border border-[#222831] rounded-xl p-5 shadow-lg hover:shadow-2xl transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Upload ID: {a.upload_id}</p>
                            <p className="text-xs text-muted-foreground">Reason: {a.reason}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.status === 'approved' ? 'bg-green-100 text-green-800' : a.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{a.status}</span>
                        </div>
                        {a.status !== 'pending' && a.admin_response && (() => {
                          const resolverRole = users.find((u:any) => u.user_id === a.resolved_by)?.role
                          const label = resolverRole === 'supervisor' ? 'Respond of Supervisor' : resolverRole === 'admin' ? 'Respond of Admin' : 'Resolution Message'
                          return (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-foreground mb-1">{label}:</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{a.admin_response}</p>
                            </div>
                          )
                        })()}
                        <div className="grid grid-cols-2 gap-4 text-xs pt-3 mt-2 border-t border-[#F0F2F5]">
                          <div>
                            <p className="text-muted-foreground">Platform</p>
                            <p className="font-medium text-foreground capitalize">{a.platform}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Amount</p>
                            <p className="font-medium text-foreground">{a.amount || 'N/A'}</p>
                          </div>
                        </div>
                        {a.image_url && (
                          <div className="mt-2">
                            <a href={`${API_SERVER_URL}${a.image_url}`} target="_blank" rel="noopener noreferrer" className="text-[#6E67FF] hover:underline text-xs">View Image</a>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <span>Created: {new Date(a.created_at).toLocaleString()}</span>
                          {a.resolved_at && <span>Resolved: {new Date(a.resolved_at).toLocaleString()}</span>}
                        </div>
                        {a.status !== 'pending' && (
                          <div className="mt-3">
                            <button
                              onClick={() => setUndoModalAppealId(a.appeal_id)}
                              className="px-3 py-2 bg-white border border-black rounded-md text-xs hover:bg-[#0F828C] hover:text-white transition-colors"
                            >
                              Undo Resolution
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  {openUserAppeals.list
                    .filter((a:any) => appealsStatus === 'all' || a.status === appealsStatus)
                    .length === 0 && (
                      <div className="bg-white rounded-xl shadow-sm p-6 text-center text-sm text-muted-foreground">No appeals match the current filter</div>
                    )}
                </div>
              </div>
            )}

            {!openUserAppeals && (appeals.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No appeals found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredAppealsGroups.map(([key, list]) => (
                  <div key={key} className="rounded-xl border border-[#E5E7EB] border-l-4 border-l-[#132440] bg-white p-6 shadow-lg ring-1 ring-[#6E67FF]/15 hover:ring-[#6E67FF]/30 transition-shadow hover:shadow-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-foreground">{list[0].username || 'Unknown User'}</p>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-[#F3F4F6] text-muted-foreground">{list.length} appeals</span>
                        {list.filter((a:any)=>a.status==='pending').length > 0 ? (
                          <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">pending: {list.filter((a:any)=>a.status==='pending').length}</span>
                        ) : (
                          <span className="ml-2 inline-block w-2 h-2 rounded-full bg-[#E5E7EB]" aria-hidden="true"></span>
                        )}
                      </div>
                      <button
                        onClick={() => setOpenUserAppeals({ key, list })}
                        className="text-xs px-4 py-2 rounded-md border border-black bg-white text-foreground transition-all duration-200 hover:bg-[#0F828C] hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F828C]"
                      >
                        View Appeals
                      </button>
                    </div>
                    
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'archived' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground mb-6">Archieved Requests</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-gray-900">Resolved Supervisor Requests</p>
                <span className="text-xs text-muted-foreground">{adminRequestHistory.length} items</span>
              </div>
              {adminRequestHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No archived requests</p>
              ) : (
                <div className="space-y-3">
                  {adminRequestHistory.map((r) => (
                    <div key={r.request_id} className="bg-white border border-[#222831] rounded-xl p-5 text-sm shadow-lg hover:shadow-2xl transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">Appeal ID: {r.appeal_id}</p>
                          <p className="text-muted-foreground">Supervisor: {r.supervisor_name}</p>
                          <p className="text-muted-foreground">Action: {r.action.replace('_',' ')}</p>
                          <p className="text-muted-foreground">Reason: {r.reason}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{r.status}</span>
                          <div className="text-xs text-muted-foreground mt-1">Resolved: {r.resolved_at ? new Date(r.resolved_at).toLocaleString() : 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground mb-2">Supervisor Requests to Undo Resolution</h2>
            <div className="flex items-center justify-end mb-3">
              <select
                value={appealsStatus}
                onChange={(e) => setAppealsStatus(e.target.value as any)}
                className="w-full sm:w-40 p-3 border border-[#D9D9E3] rounded-lg text-sm bg-white"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            {adminRequests.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No supervisor requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {adminRequests
                  .filter((r:any)=> appealsStatus === 'all' || r.status === appealsStatus)
                  .map((r:any) => {
                    const a = appeals.find((x:any)=>x.appeal_id===r.appeal_id)
                    return (
                      <div key={r.request_id} className="bg-white rounded-xl border border-[#1E3E62]/30 p-5 shadow-lg ring-1 ring-[#1E3E62]/10 hover:ring-[#1E3E62]/20 transition-shadow hover:shadow-2xl">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-foreground">Appeal ID: {r.appeal_id}</p>
                            <p className="text-xs text-muted-foreground">Supervisor: {r.supervisor_name || 'Supervisor'}</p>
                            <p className="text-xs text-muted-foreground">Action: {String(r.action).replace('_',' ')}</p>
                            <p className="text-xs text-muted-foreground">Reason: {r.reason}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'approved' ? 'bg-green-100 text-green-800' : r.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{r.status}</span>
                            <div className="text-xs text-muted-foreground mt-1">{r.resolved_at ? `Resolved: ${new Date(r.resolved_at).toLocaleString()}` : `Created: ${new Date(r.created_at).toLocaleString()}`}</div>
                          </div>
                        </div>
                        {a && (
                          <div className="grid grid-cols-2 gap-4 text-xs pt-3 mt-2 border-t border-[#F0F2F5]">
                            <div>
                              <p className="text-muted-foreground">Platform</p>
                              <p className="font-medium text-foreground capitalize">{a.platform}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Amount</p>
                              <p className="font-medium text-foreground">{a.amount || 'N/A'}</p>
                            </div>
                          </div>
                        )}
                        {a?.image_url && (
                          <div className="mt-2">
                            <a href={`${API_SERVER_URL}${a.image_url}`} target="_blank" rel="noopener noreferrer" className="text-[#1E3E62] hover:underline text-xs">View Image</a>
                          </div>
                        )}
                        <div className="mt-4 flex items-center gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await reviewAPI.resolveAdminRequest(r.request_id, { approved: true })
                                loadAppeals(); loadStats(); loadAdminRequests(); loadAdminRequestHistory()
                                notify({ title: 'Undo Approved', message: 'Undo approved and appeal reset to pending', variant: 'success' })
                              } catch {
                                notify({ title: 'Approval Failed', message: 'Failed to approve request', variant: 'error' })
                              }
                            }}
                            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                          >Approve Undo</button>
                          <button
                            onClick={async () => {
                              try {
                                await reviewAPI.resolveAdminRequest(r.request_id, { approved: false })
                                loadAdminRequests(); loadAdminRequestHistory()
                                notify({ title: 'Request Rejected', message: 'Request rejected', variant: 'warning' })
                              } catch {
                                notify({ title: 'Rejection Failed', message: 'Failed to reject request', variant: 'error' })
                              }
                            }}
                            className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                          >Reject</button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Appeals inline view now lives within the Appeals tab; previous modal removed */}
      {undoModalAppealId !== null && (() => {
        const a = appeals.find((x:any)=>x.appeal_id===undoModalAppealId)
        return (
          <Modal open={true} title="Undo Resolution" onClose={() => setUndoModalAppealId(null)}>
            <div className="space-y-3">
              <p className="text-sm text-foreground">Appeal ID: {a?.appeal_id ?? 'N/A'}</p>
              <p className="text-sm text-foreground">Current Status: {a?.status ?? 'N/A'}</p>
              <p className="text-sm text-muted-foreground">This resets the appeal to pending and sets the upload under review.</p>
              {a?.image_url ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Preview</p>
                  <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                    <img src={`${API_SERVER_URL}${a.image_url}`} alt="Upload preview" className="w-full h-auto object-contain max-h-64" />
                  </div>
                </div>
              ) : (
                (()=>{console.error('Image URL unavailable for head admin undo'); return null})()
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Admin Notice (optional)</p>
                <textarea
                  value={undoNotice}
                  onChange={(e)=>setUndoNotice(e.target.value)}
                  placeholder="Explain why the previous resolution is being undone"
                  className="w-full p-3 border border-input rounded-lg mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Letter OCR Score</p>
                  <p className="text-sm font-medium text-foreground">{typeof a?.ocr_confidence === 'number' ? `${(a.ocr_confidence*100).toFixed(1)}%` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Word OCR Score</p>
                  <p className="text-sm font-medium text-foreground">{a?.field_validations ? (()=>{const v=a.field_validations; const keys=Object.keys(v||{}); const avg=keys.length? keys.reduce((acc,k)=>acc+((v[k]?.confidence)||0),0)/keys.length:0; return `${(avg*100).toFixed(1)}%`})() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Figure OCR Score</p>
                  <p className="text-sm font-medium text-foreground">{typeof a?.field_anomaly_score === 'number' ? `${(100 - (a.field_anomaly_score*100)).toFixed(1)}%` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CNN Score</p>
                  <p className="text-sm font-medium text-foreground">{typeof a?.cnn_fraud_probability === 'number' ? `${(a.cnn_fraud_probability*100).toFixed(1)}%` : 'N/A'}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await adminAPI.undoAppeal(undoModalAppealId!, { notice: undoNotice || undefined })
                    setUndoModalAppealId(null)
                    setUndoNotice('')
                    loadAppeals(); loadStats(); loadAdminRequests(); notify({ title: 'Appeal Reset', message: 'Appeal reset to pending', variant: 'success' })
                  } catch {
                    notify({ title: 'Undo Failed', message: 'Failed to undo appeal', variant: 'error' })
                  }
                }}
                className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Confirm
              </button>
              <button onClick={() => setUndoModalAppealId(null)} className="px-3 py-2 bg-white border border-[#E5E7EB] rounded-md">Cancel</button>
            </div>
          </Modal>
        )
      })()}
      <SideNotification
        open={sideOpen}
        title={sideTitle}
        sender={sideSender}
        timestamp={sideTime}
        message={sideMessage}
        variant={sideVariant}
        actionLabel={(notify as any)._actionLabel}
        onAction={(notify as any)._onAction}
        onClose={() => setSideOpen(false)}
      />
    </div>
  )
}

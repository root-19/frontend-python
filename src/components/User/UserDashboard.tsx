import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { uploadAPI, reviewAPI, UploadResult, API_SERVER_URL } from '../../lib/api'
import { Upload, History, LogOut, UserCircle, AlertCircle, XCircle, Bell, Archive, Trash2, Search, ArrowUpDown } from 'lucide-react'
import Modal from '../ui/Modal'
import SideNotification from '../ui/SideNotification'
 

interface UserDashboardProps {
  onLogout: () => void
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: any }>{
  constructor(props: { children: React.ReactNode }){
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: any){
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, info: React.ErrorInfo){
    console.error(error, info)
  }
  render(){
    if (this.state.hasError){
      const msg = String(this.state.error?.message || this.state.error || 'Render error')
      return (
        <div className="min-h-screen bg-white text-gray-900 p-6">
          <div className="max-w-2xl mx-auto">
            <p className="text-lg font-semibold mb-2">Something went wrong while rendering the analysis.</p>
            <p className="text-sm text-muted-foreground mb-4">Please try again or re-upload your screenshot.</p>
            <pre className="text-xs bg-muted rounded p-3 overflow-auto">{msg}</pre>
          </div>
        </div>
      )
    }
    return this.props.children as any
  }
}

export default function UserDashboard({ onLogout }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'archive' | 'appeals'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | { error: string; status: string } | null>(null);
  const [history, setHistory] = useState<any[]>([])
  const [deletedIds, setDeletedIds] = useState<number[]>([])
  const [archivedIds, setArchivedIds] = useState<number[]>([])
  const [historySearch, setHistorySearch] = useState('')
  const [historySort, setHistorySort] = useState<'date_desc'|'date_asc'|'status'>('date_desc')
  const [historyPage, setHistoryPage] = useState(1)
  const pageSize = 5
  const [appealUploadId, setAppealUploadId] = useState<number | null>(null)
  const [appealReason, setAppealReason] = useState('')
  const username = localStorage.getItem('username') || 'User'
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showNotice, setShowNotice] = useState<boolean>(false)
  const [showRawLines, setShowRawLines] = useState<boolean>(false)
  const [userAppeals, setUserAppeals] = useState<any[]>([])
  const [updatesCount, setUpdatesCount] = useState<number>(0)
  const [showNotificationsPanel, setShowNotificationsPanel] = useState<boolean>(false)
  const [newUpdates, setNewUpdates] = useState<any[]>([])
  const [oldUpdates, setOldUpdates] = useState<any[]>([])
  const notifContainerRef = useRef<HTMLDivElement | null>(null)
  const notifButtonRef = useRef<HTMLButtonElement | null>(null)
  const notifDropdownRef = useRef<HTMLDivElement | null>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null)
  
  const [sideOpen, setSideOpen] = useState(false)
  const [sideTitle, setSideTitle] = useState('')
  const [sideSender, setSideSender] = useState('')
  const [sideTime, setSideTime] = useState('')
  const [sideMessage, setSideMessage] = useState('')
  const [sideVariant, setSideVariant] = useState<'success'|'error'|'warning'|'info'>('info')

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800'
      case 'tampered':
      case 'generated':
        return 'bg-red-100 text-red-800'
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

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
    if (showNotificationsPanel && notifButtonRef.current) {
      const rect = notifButtonRef.current.getBoundingClientRect()
      const right = Math.max(8, window.innerWidth - rect.right)
      const top = rect.bottom + 8
      setDropdownPos({ top, right })
    }
  }, [showNotificationsPanel])

  

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem('user_history_deleted_ids') || '[]')
      const a = JSON.parse(localStorage.getItem('user_history_archived_ids') || '[]')
      setDeletedIds(Array.isArray(d) ? d : [])
      setArchivedIds(Array.isArray(a) ? a : [])
    } catch {}
  }, [])


  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    }
    if (activeTab === 'appeals') {
      loadUserAppeals()
      try {
        const currentMap: Record<string, string> = {}
        if (Array.isArray(userAppeals)) {
          for (const ap of userAppeals) {
            if (ap && ap.id && ap.admin_response) {
              currentMap[String(ap.id)] = String(ap.admin_response)
            }
          }
        }
        localStorage.setItem('appealResponsesSeen', JSON.stringify(currentMap))
      } catch {}
      setUpdatesCount(0)
    }
    try {
      if (localStorage.getItem('showScoringNotice') === 'true') {
        setShowNotice(true)
        localStorage.removeItem('showScoringNotice')
      }
    } catch {}
  }, [activeTab])

  useEffect(() => {
    loadUserAppeals()
  }, [])

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const response = await uploadAPI.getHistory()
      setHistory(response.data)
      setHistoryPage(1)
    } catch (error) {
      console.error('Failed to load history:', error)
    }
  }

  const filteredHistory = (() => {
    const base = history.filter((h:any) => !deletedIds.includes(Number(h.id)))
      .filter((h:any) => !archivedIds.includes(Number(h.id)))
      .filter((h:any) => {
        if (!historySearch.trim()) return true
        const s = historySearch.toLowerCase()
        return String(h.filename||'').toLowerCase().includes(s) || String(h.platform||'').toLowerCase().includes(s) || String(h.status||'').toLowerCase().includes(s)
      })
    const sorted = [...base].sort((a:any,b:any) => {
      if (historySort === 'status') return String(a.status).localeCompare(String(b.status))
      const ta = Date.parse(a.upload_date), tb = Date.parse(b.upload_date)
      return historySort === 'date_asc' ? ta - tb : tb - ta
    })
    return sorted
  })()

  const archivedHistory = history.filter((h:any) => archivedIds.includes(Number(h.id))).filter((h:any) => !deletedIds.includes(Number(h.id)))

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize))
  const pageSlice = filteredHistory.slice((historyPage-1)*pageSize, historyPage*pageSize)

  const archiveItem = (id:number) => {
    setArchivedIds((prev:number[]) => {
      const next = Array.from(new Set([...prev, id]))
      try { localStorage.setItem('user_history_archived_ids', JSON.stringify(next)) } catch {}
      return next
    })
    notify({ title: 'Archived', message: 'Item moved to Archive', variant: 'info' })
  }
  const deleteItem = (id:number) => {
    setDeletedIds((prev:number[]) => {
      const next = Array.from(new Set([...prev, id]))
      try { localStorage.setItem('user_history_deleted_ids', JSON.stringify(next)) } catch {}
      return next
    })
    setArchivedIds((prev:number[]) => {
      const next = prev.filter((x:number) => x !== id)
      try { localStorage.setItem('user_history_archived_ids', JSON.stringify(next)) } catch {}
      return next
    })
    notify({ title: 'Deleted', message: 'Item permanently removed from History', variant: 'warning' })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
      const url = URL.createObjectURL(e.target.files[0])
      setPreviewUrl(url)
    }
  }

  const loadUserAppeals = async () => {
    try {
      const response = await reviewAPI.getUserAppeals()
      setUserAppeals(response.data)
      try {
        const seenStr = localStorage.getItem('appealResponsesSeen') || '{}'
        let seen: Record<string, string> = {}
        try { seen = JSON.parse(seenStr) } catch {}
        const withResponse = Array.isArray(response.data)
          ? response.data.filter((ap: any) => Boolean(ap?.admin_response))
          : []
        const newList = withResponse.filter((ap: any) => String(seen[String(ap.id)] || '') !== String(ap.admin_response))
        const oldList = withResponse.filter((ap: any) => !newList.some((n: any) => n.id === ap.id))
        const sortByTimeDesc = (a: any, b: any) => {
          const ta = Date.parse(a.resolved_at || a.created_at)
          const tb = Date.parse(b.resolved_at || b.created_at)
          return tb - ta
        }
        const sortedNew = newList.sort(sortByTimeDesc)
        setUpdatesCount(sortedNew.length)
        setNewUpdates(sortedNew.slice(0, 5))
        setOldUpdates(oldList.sort(sortByTimeDesc).slice(0, 5))
        if (sortedNew.length > 0) {
          const n = sortedNew[0]
          const t = new Date(n.resolved_at || n.created_at).toLocaleString()
          const title = n.status === 'approved' ? 'Appeal Approved' : n.status === 'rejected' ? 'Appeal Rejected' : 'Appeal Returned'
          setSideTitle(title)
          setSideSender('Supervisor')
          setSideTime(t)
          setSideMessage(String(n.admin_response || ''))
          setSideOpen(true)
        }
      } catch {}
    } catch (error) {
      console.error('Failed to load appeals:', error)
    }
  }

  const handleNotificationsClick = () => {
    setShowNotificationsPanel((prev) => {
      const next = !prev
      if (next) {
        try {
          const currentMap: Record<string, string> = {}
          if (Array.isArray(userAppeals)) {
            for (const ap of userAppeals) {
              if (ap && ap.id && ap.admin_response) {
                currentMap[String(ap.id)] = String(ap.admin_response)
              }
            }
          }
          localStorage.setItem('appealResponsesSeen', JSON.stringify(currentMap))
        } catch {}
        setUpdatesCount(0)
      }
      return next
    })
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles[0]) {
      setFile(droppedFiles[0])
      setResult(null)
      const url = URL.createObjectURL(droppedFiles[0])
      setPreviewUrl(url)
    }
  }

  const notify = (opts: { title: string; message: string; variant: 'success'|'error'|'warning'|'info'; requireConfirm?: boolean; onAction?: () => void }) => {
    setSideTitle(opts.title)
    setSideSender('System')
    setSideTime(new Date().toLocaleString())
    setSideMessage(opts.message)
    setSideVariant(opts.variant)
    // When confirmation is required, wire action through a temporary closure on onClick using SideNotification props
    ;(notify as any)._actionLabel = opts.requireConfirm ? 'OK' : undefined
    ;(notify as any)._onAction = opts.onAction
    setSideOpen(true)
  }

  const handleUpload = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      notify({ title: 'Session expired', message: 'Your session has expired. Please sign in again.', variant: 'error', requireConfirm: true, onAction: () => { if (typeof window !== 'undefined') window.location.href = '/login' } })
      return
    }
    if (!file) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await uploadAPI.upload(formData);
      const data: UploadResult = response.data;
      setResult(data);

      const reasons = (response.data as any).reasons || [];
      const reasonStr = String(reasons.join(' ')).toLowerCase();
      if (reasonStr.includes('unsupported') || String((response.data as any).platform || '').toLowerCase() === 'unknown' || String((response.data as any).decision_label || '').toLowerCase() === 'unsupported') {
        notify({ title: 'NOT ANALYZED', message: 'IMAGE/SCREENSHOT IS UNSUPPORTED FOR THIS WEBSITE', variant: 'error' })
      } else if (reasonStr.includes('restriction') || reasonStr.includes('not applicable')) {
        const msg = reasonStr.includes('type') ? 'Not applicable for this type of payment' : 'Not applicable for this screenshot/image';
        notify({ title: 'Not Applicable', message: msg, variant: 'error' })
      } else {
        const finalScore = (data.final_anomaly_score ?? (data as any).final_fraud_score ?? 0);
        const b = (data as any).scores_breakdown || {};
        const avgPct = ((Number(b.ocr_character_score_pct || 0) + Number(b.ocr_field_score_pct || 0) + Number(b.figure_format_score_pct || 0)) / 3);
        if (avgPct <= 75) {
          notify({ title: 'High Risk', message: 'WARNING GENERATED. High fraud risk detected based on OCR.', variant: 'error' })
        } else if (finalScore > 0.70) {
          notify({ title: 'High Risk', message: 'High fraud risk detected (Final Score > 70%). Please review or appeal.', variant: 'error' })
        } else if (finalScore > 0.40) {
          notify({ title: 'Medium Risk', message: 'Medium risk detected (Final Score 40-70%). Manual review recommended.', variant: 'warning' })
        } else {
          notify({ title: 'Upload Successful', message: 'Upload successful. Low risk detected.', variant: 'success' })
        }
      }

      setFile(null);
      if (activeTab === 'history') {
        loadHistory();
      }
    } catch (err: any) {
      console.error('Upload error:', err.response?.data || err.message);
      setResult({
        error: err.response?.data?.detail || 'Upload failed. Please try again.',
        status: 'error',
      });
    }finally {
      setUploading(false);
    }
  };

  const handleAppeal = async (uploadId: number) => {
    if (!appealReason.trim()) {
      notify({ title: 'Missing Reason', message: 'Please provide a reason for your appeal', variant: 'warning' })
      return
    }

    try {
      await reviewAPI.createAppeal({
        upload_id: uploadId,
        reason: appealReason
      })
      notify({ title: 'Appeal Submitted', message: 'Appeal submitted successfully', variant: 'success' })
      setAppealUploadId(null)
      setAppealReason('')
      loadHistory()
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to submit appeal'
      notify({ title: 'Submission Failed', message: msg, variant: 'error' })
    }
  }

  

  return (
    <ErrorBoundary>
    <div className={`min-h-screen bg-[#F6F6F6] font-sans`}
    >
      {showNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowNotice(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-[92%] max-w-xl p-6">
            <h3 className="text-xl font-bold text-foreground mb-2">How Scoring Works</h3>
            <p className="text-sm text-muted-foreground mb-4">We analyze your screenshot using OCR and visual checks. The risk shown is primarily based on OCR thresholds, with CNN visuals used for support.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-muted rounded p-3">
                <p className="text-xs text-muted-foreground">Letter-level OCR</p>
                <p className="text-sm font-semibold text-foreground">Per-character similarity to expected tokens</p>
              </div>
              <div className="bg-muted rounded p-3">
                <p className="text-xs text-muted-foreground">Field-level checks</p>
                <p className="text-sm font-semibold text-foreground">Required labels, amounts, and references</p>
              </div>
              <div className="bg-muted rounded p-3">
                <p className="text-xs text-muted-foreground">Visual (CNN)</p>
                <p className="text-sm font-semibold text-foreground">Authenticity heatmap for anomaly hints</p>
              </div>
            </div>
            <div className="bg-muted rounded p-3 mb-4">
              <p className="text-xs text-muted-foreground">Decision guide</p>
              <p className="text-sm text-foreground">OCR ≤ 75% → High risk (FRAUD/GENERATED)</p>
              <p className="text-sm text-foreground">OCR 76–84% → Review by admin</p>
              <p className="text-sm text-foreground">OCR 85–89% → Review, borderline</p>
              <p className="text-sm text-foreground">OCR ≥ 90% → Low risk</p>
              <p className="text-xs text-muted-foreground mt-2">CNN visuals assist and may raise flags but do not alone determine the final risk percentage shown.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNotice(false)} className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">Got it</button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary/20 blur-3xl rounded-full animate-float" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-indigo-300/20 blur-3xl rounded-full animate-float" />
        <div className="bg-white/60 backdrop-blur supports-[backdrop-filter]:glass-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1E3E62] text-white flex items-center justify-center shadow-xl ring-2 ring-[#1E3E62]/30">
              <UserCircle className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">User Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome, {username}</p>
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
                          const toDate = (ap: any) => new Date(ap.resolved_at || ap.created_at)
                          const today = all.filter((ap) => toDate(ap) >= startToday)
                          const yesterday = all.filter((ap) => toDate(ap) >= startYesterday && toDate(ap) < startToday)
                          const older = all.filter((ap) => toDate(ap) < startYesterday)
                          const renderItem = (ap: any) => {
                            const statusTxt = String(ap.status).replace('_', ' ')
                            const statusCls = ap.status === 'approved' ? 'text-green-700' : ap.status === 'rejected' ? 'text-red-700' : 'text-gray-700'
                            const isNew = newUpdates.some((n:any) => n.id === ap.id)
                            return (
                              <li key={ap.id} className={`p-4 rounded hover:bg-[#F9FBFF] cursor-pointer flex items-start gap-4 ${isNew ? 'border-l-4 border-[#1E3E62] bg-[#F8FAFD]' : ''}`} onClick={() => setShowNotificationsPanel(false)}>
                                <div className="text-xs text-muted-foreground min-w-[130px]">
                                  {new Date(ap.resolved_at || ap.created_at).toLocaleString()}
                                </div>
                                <p className={`text-sm font-semibold ${statusCls}`}>{statusTxt}</p>
                                <p className="text-sm text-gray-700 line-clamp-2">{ap.admin_response}</p>
                              </li>
                            )
                          }
                          return (
                            <>
                              {today.length > 0 && (
                                <li className="px-1">
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Today</p>
                                  <ul className="space-y-2">
                                    {today.map((ap) => renderItem(ap))}
                                  </ul>
                                </li>
                              )}
                              {yesterday.length > 0 && (
                                <li className="px-1">
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Yesterday</p>
                                  <ul className="space-y-2">
                                    {yesterday.map((ap) => renderItem(ap))}
                                  </ul>
                                </li>
                              )}
                              {older.length > 0 && (() => {
                                const byDate: Record<string, any[]> = {}
                                for (const ap of older) {
                                  const dt = toDate(ap)
                                  const key = dt.toLocaleDateString()
                                  byDate[key] = byDate[key] || []
                                  byDate[key].push(ap)
                                }
                                return (
                                  <>
                                    {Object.entries(byDate).sort((a,b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()).map(([dateStr, list]) => (
                                      <li key={dateStr} className="px-1">
                                        <p className="text-xs font-semibold text-gray-700 mb-1">{dateStr}</p>
                                        <ul className="space-y-2">
                                          {list.map((ap) => renderItem(ap))}
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
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-[#6E67FF]/40 bg-gradient-to-br from-black via-[#1A1A1F] to-[#6E67FF] text-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('upload')}
            className={`relative group px-4 py-2 font-medium transition-colors ${
              activeTab === 'upload' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:-translate-y-0.5 group-hover:opacity-90" />
              <span>Upload</span>
            </div>
            <div className={`absolute left-0 right-0 -bottom-1 h-0.5 ${
              activeTab === 'upload' ? 'bg-[#3B82F6]' : 'bg-[#3B82F6] w-0 group-hover:w-full transition-all duration-300 ease-in-out'
            }`}></div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`relative group px-4 py-2 font-medium transition-colors ${
              activeTab === 'history' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:-translate-y-0.5 group-hover:opacity-90" />
              <span>History</span>
            </div>
            <div className={`absolute left-0 right-0 -bottom-1 h-0.5 ${
              activeTab === 'history' ? 'bg-[#3B82F6]' : 'bg-[#3B82F6] w-0 group-hover:w-full transition-all duration-300 ease-in-out'
            }`}></div>
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`relative group px-4 py-2 font-medium transition-colors ${
              activeTab === 'archive' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:-translate-y-0.5 group-hover:opacity-90" />
              <span>Archive</span>
            </div>
            <div className={`absolute left-0 right-0 -bottom-1 h-0.5 ${
              activeTab === 'archive' ? 'bg-[#3B82F6]' : 'bg-[#3B82F6] w-0 group-hover:w-full transition-all duration-300 ease-in-out'
            }`}></div>
          </button>
          <button
            onClick={() => setActiveTab('appeals')}
            className={`relative group px-4 py-2 font-medium transition-colors ${
              activeTab === 'appeals' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:-translate-y-0.5 group-hover:opacity-90" />
              <span>Appeals</span>
            </div>
            {updatesCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] px-1 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold text-center">
                {updatesCount}
              </span>
            )}
            <div className={`absolute left-0 right-0 -bottom-1 h-0.5 ${
              activeTab === 'appeals' ? 'bg-[#3B82F6]' : 'bg-[#3B82F6] w-0 group-hover:w-full transition-all duration-300 ease-in-out'
            }`}></div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'upload' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-lg p-8 animate-fade-in-up">
              <h2 className="text-2xl font-bold text-foreground mb-6">Upload Payment Screenshot</h2>

              

              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">
                  Upload Screenshot
                </label>
                <p className="text-xs text-muted-foreground mb-2">Platform is detected automatically (GCash or Maya). Just upload your screenshot.</p>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${isDragging ? 'border-[#6E67FF] bg-[#6E67FF]/5' : 'border-[#D9D9E3]'}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {!previewUrl ? (
                      <>
                        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium mb-2">
                          {file ? file.name : 'Click to upload or drag and drop'}
                        </p>
                        <p className="text-sm text-muted-foreground">PNG, JPG, JPEG up to 10MB</p>
                      </>
                      ) : (
                      <div className="flex flex-col items-center gap-3">
                        <img src={previewUrl} alt="Preview" className="max-h-48 rounded-lg shadow-md" />
                        <p className="text-sm text-muted-foreground">Preview</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="relative overflow-hidden w-full bg-gradient-to-r from-[#6E67FF] via-[#7C73FF] to-[#A259FF] text-white py-3 rounded-lg font-semibold shadow-lg hover:brightness-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {uploading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>Analyze Screenshot</span>
                    </>
                  )}
                </span>
                <span className="absolute inset-0 opacity-30 blur-[2px] animate-[shimmer_2.2s_linear_infinite] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.3),transparent)]" />
              </button>

              {uploading && (
                <div className="mt-4 space-y-2">
                  <div className="h-3 rounded bg-muted relative overflow-hidden skeleton animate-shimmer" />
                  <div className="h-3 rounded bg-muted relative overflow-hidden skeleton animate-shimmer" />
                  <div className="h-3 rounded bg-muted relative overflow-hidden skeleton animate-shimmer" />
                </div>
              )}

              
            </div>
            <div className="glass-card rounded-lg p-6 animate-fade-in-up">
              <h2 className="text-2xl font-bold text-foreground mb-6">Results</h2>
              {!result ? (
                <div className="rounded-2xl bg-white border border-[#E5E7EB] shadow p-6 text-center">
                  <p className="text-sm text-muted-foreground">Upload a screenshot on the left to see analysis here.</p>
                </div>
              ) : (
                <div className="p-0">
                  {'error' in result ? (
                    <div className="flex items-center gap-3 text-destructive">
                      <XCircle className="w-6 h-6" />
                      <span className="font-medium">{result.error}</span>
                    </div>
                  ) : (
                    (() => {
                      const uploadResult = result as UploadResult;
                      return (
                        <>
                          {(() => {
                            const finalScore = (uploadResult.final_anomaly_score as number | undefined) ?? (uploadResult as any).final_fraud_score ?? 0;
                            const pct = (finalScore * 100).toFixed(1);
                            const b = (uploadResult as any).scores_breakdown || {};
                            const charPct = Number(b.ocr_character_score_pct || 0);
                            const wordPct = Number(b.ocr_field_score_pct || 0);
                            const figPct = Number(b.figure_format_score_pct || 0);
                            const avgPct = (charPct + wordPct + figPct) / 3;
                            const statusColor = finalScore >= 0.70 ? 'text-red-500' : finalScore >= 0.40 ? 'text-yellow-400' : 'text-green-400';
                            const ringColor = finalScore >= 0.70 ? 'ring-red-500/40' : finalScore >= 0.40 ? 'ring-yellow-400/40' : 'ring-green-400/40';
                            return (
                              <div className="mb-4">
                                <div className={`bg-white rounded-lg shadow p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 ring-2 ${ringColor}`}>
                                  <div>
                                      <p className="text-xs sm:text-sm text-muted-foreground">Overall Fraud</p>
                                    {(() => {
                                      const lowMsg = 'WARNING GENERATED';
                                      const rs = String((((uploadResult as any).reasons || []) as string[]).join(' ')).toLowerCase();
                                      const restricted = (rs.includes('restriction') || rs.includes('unsupported') || rs.includes('not applicable'));
                                      const isUnsupported = (String(uploadResult.status || (uploadResult as any).decision_label || '').toLowerCase() === 'unsupported') || (String(((uploadResult as any).platform || '')).toLowerCase() === 'unknown');
                                      if (isUnsupported) return (<span className="text-gray-900 text-base sm:text-xl font-semibold">UNKNOWN</span>);
                                      if (restricted) return (<span className="text-red-600 text-base sm:text-xl font-semibold">----</span>);
                                      if (avgPct <= 75) return (<span className="text-gray-900 text-base sm:text-xl font-semibold">{lowMsg}</span>);
                                      if (avgPct <= 89) return (<span className="text-gray-900 text-sm sm:text-xl font-semibold">APPEAL TO ADMIN TO REVIEW MANUALLY</span>);
                                      return (<p className={`text-2xl sm:text-3xl font-bold ${statusColor}`}>{pct}%</p>);
                                    })()}
                                  </div>
                                  {(((typeof window !== 'undefined') && (localStorage.getItem('dev_mode') === '1'))) && (
                                    <div className="text-left sm:text-right">
                                      <p className="text-xs text-muted-foreground">Decision Guide</p>
                                      <p className="text-xs sm:text-sm text-gray-700">OCR ≤ 75 → WARNING GENERATED/FRAUD · 76–89 → APPEAL TO ADMIN TO REVIEW MANUALLY · ≥ 90 → numeric · CNN informational</p>
                                    </div>
                                  )}
                                  </div>
                              </div>
                            )
                          })()}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${((uploadResult as any).platform === 'gcash') ? 'bg-gcash/20 text-gcash' : ((uploadResult as any).platform === 'paymaya') ? 'bg-maya/20 text-maya' : 'bg-gray-200 text-gray-700'}`}>
                                {String((uploadResult as any).platform || 'Unknown').toUpperCase()}
                              </span>
                              <span className="text-xs sm:text-sm text-muted-foreground">Platform</span>
                            </div>
                            <div className="text-left sm:text-right">
                              {(() => {
                                const b = (uploadResult as any).scores_breakdown || {};
                                const charPct = Number(b.ocr_character_score_pct || 0);
                                const wordPct = Number(b.ocr_field_score_pct || 0);
                                const figPct = Number(b.figure_format_score_pct || 0);
                                const avgPct = (charPct + wordPct + figPct) / 3;
                                const rawLabel = String(((uploadResult as any).decision_label) || uploadResult.status).toUpperCase();
                                const isUnsupported = rawLabel === 'UNSUPPORTED' || String(((uploadResult as any).platform || '')).toLowerCase() === 'unknown';
                                const label = isUnsupported ? 'UNSUPPORTED' : (avgPct <= 75 ? 'FRAUD' : rawLabel);
                                const cls = isUnsupported ? 'bg-gray-200 text-gray-700' : (avgPct <= 75 ? 'bg-red-100 text-red-700' : (((uploadResult as any).decision_label === 'FAKE') ? 'bg-red-100 text-red-700' : ((uploadResult as any).decision_label === 'GENERATED') ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'));
                                return (
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${cls}`}>{label}</span>
                                );
                              })()}
                            </div>
                          </div>

                          {(() => {
                            const b = (uploadResult as any).scores_breakdown || {};
                            const charPct = Number(b.ocr_character_score_pct || 0);
                            const wordPct = Number(b.ocr_field_score_pct || 0);
                            const figPct = Number(b.figure_format_score_pct || 0);
                            const avgPct = (charPct + wordPct + figPct) / 3;
                            const cnnPct = Number(b.cnn_image_score_pct || 0);
                            const showCnnPct = avgPct <= 75 ? (100 - cnnPct) : cnnPct;
                            const showCnnClass = showCnnPct >= 95 ? 'text-green-600' : (showCnnPct >= 85 ? 'text-yellow-500' : 'text-red-600');
                            return (
                              <>
                              <div className="rounded-2xl bg-panel backdrop-blur-md border border-border shadow-lg shadow-primary/10 p-3 sm:p-4 mb-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-2" title="Per-character similarity to required tokens">
                                    <span className="text-xs sm:text-sm text-muted-foreground">Letter-Level OCR</span>
                                    <span className="text-base sm:text-lg font-semibold text-gray-900">{charPct.toFixed(1)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2" title="Exact token/label matches and currency markers">
                                    <span className="text-xs sm:text-sm text-muted-foreground">Word-Level OCR</span>
                                    <span className="text-base sm:text-lg font-semibold text-gray-900">{wordPct.toFixed(1)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2" title="Layout and structure checks (order, sections, counts)">
                                    <span className="text-xs sm:text-sm text-muted-foreground">Figure-Level OCR</span>
                                    <span className="text-base sm:text-lg font-semibold text-gray-900">{figPct.toFixed(1)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2" title="Average of Letter, Word, and Figure">
                                    <span className="text-xs sm:text-sm text-muted-foreground">Average OCR</span>
                                    <span className="text-base sm:text-lg font-semibold text-gray-900">{avgPct.toFixed(1)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2" title="Image-level authenticity score">
                                    <span className="text-xs sm:text-sm text-muted-foreground">CNN Score</span>
                                    <span className={`text-base sm:text-lg font-bold ${showCnnClass}`}>{showCnnPct.toFixed(1)}%</span>
                                  </div>
                                </div>
                              </div>
                              
                              </>
                            );
                          })()}

                          {(() => {
                            const lines = (((uploadResult as any).ordered_lines ?? (uploadResult as any).raw_lines) as string[]) || []
                            const platform = String((uploadResult as any).platform || '').toLowerCase()
                            const tokens = platform === 'paymaya'
                              ? ['Sent money','Completed','Transaction details','Reference']
                              : platform === 'gcash'
                              ? ['Sent via GCash','Amount','Total Amount Sent','Ref No']
                              : []
                            const distance = (a: string, b: string) => {
                              const m = a.length, n = b.length
                              const dp: number[][] = Array.from({length: m+1}, () => Array(n+1).fill(0))
                              for (let i=0;i<=m;i++) dp[i][0] = i
                              for (let j=0;j<=n;j++) dp[0][j] = j
                              for (let i=1;i<=m;i++) {
                                for (let j=1;j<=n;j++) {
                                  const cost = a[i-1] === b[j-1] ? 0 : 1
                                  dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost)
                                }
                              }
                              return dp[m][n]
                            }
                            const sim = (token: string) => {
                              const lower = token.toLowerCase()
                              if (lower === 'reference') {
                                const refVal = ((uploadResult as any).extracted_data?.reference) ?? ((uploadResult as any).parsed_fields?.reference)
                                if (refVal && String(refVal).trim().length >= 6) {
                                  return 1
                                }
                              }
                              let best = 0
                              for (const ln of lines) {
                                const s = String(ln || '').toLowerCase()
                                if (s.includes(lower)) {
                                  best = 1
                                  break
                                }
                                const d = distance(lower, s)
                                const denom = Math.max(lower.length, 1)
                                const score = denom > 0 ? (1 - d/denom) : 0
                                if (score > best) best = score
                              }
                              return Math.round(best * 100)/100
                            }
                            if (tokens.length === 0 || lines.length === 0) return null
                            const items = tokens.map((t) => ({ token: t, pct: (sim(t)*100).toFixed(1) }))
                            return (
                              <div className="mb-4">
                                <p className="text-sm font-medium text-foreground mb-2">Character Token Similarity</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                  {items.map(({token,pct}) => (
                                    <div key={token} className="flex justify-between"><span>{token}</span><span>{pct}%</span></div>
                                  ))}
                                </div>
                              </div>
                            )
                          })()}

                          {/* Center-left panel: Raw OCR only */}
                          {(((typeof window !== 'undefined') && (localStorage.getItem('dev_mode') === '1'))) && (uploadResult as any).raw_full_text && (
                            <div className="grid grid-cols-1 gap-4 mb-4">
                              <div className="rounded-2xl bg-panel backdrop-blur-md border border-border shadow-lg shadow-primary/10 p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm font-medium text-foreground">OCR Raw Text</p>
                                  <button className="text-xs text-primary" onClick={() => setShowRawLines(!showRawLines)}>{showRawLines ? 'Show Block' : 'Show Lines'}</button>
                                </div>
                                <pre className="text-xs font-mono whitespace-pre-wrap break-words p-3 bg-muted rounded">
                                  {showRawLines 
                                    ? JSON.stringify(((uploadResult as any).ordered_lines ?? (uploadResult as any).raw_lines), null, 2) 
                                    : (((uploadResult as any).ordered_lines && Array.isArray((uploadResult as any).ordered_lines)) 
                                        ? ((uploadResult as any).ordered_lines.join('\n')) 
                                        : (uploadResult as any).raw_full_text)
                                  }
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* Bottom-left: Heatmap & Bottom-right: Breakdown */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {(((typeof window !== 'undefined') && (localStorage.getItem('dev_mode') === '1'))) && (uploadResult as any).cnn && (uploadResult as any).cnn.heatmap_image_token && (
                            <div className="rounded-2xl bg-panel backdrop-blur-md border border-border shadow-lg shadow-primary/10 p-4">
                                <p className="text-sm font-medium text-foreground mb-2">Visual Heatmap</p>
                                <a href={`${API_SERVER_URL}/static/heatmaps/${(uploadResult as any).cnn.heatmap_image_token}`} target="_blank" rel="noreferrer">
                                  <img src={`${API_SERVER_URL}/static/heatmaps/${(uploadResult as any).cnn.heatmap_image_token}`} className="max-h-40 rounded" />
                                </a>
                              </div>
                            )}
                            {(((typeof window !== 'undefined') && (localStorage.getItem('dev_mode') === '1'))) && (
                              <div className="rounded-2xl bg-panel backdrop-blur-md border border-border shadow p-4">
                                <p className="text-sm font-medium text-foreground mb-2">Scoring Breakdown</p>
                                {((uploadResult as any).scores_breakdown) && (
                                  <div className="space-y-2 text-xs">
                                    {[
                                      ['ocr_character_score_pct','OCR Character'],
                                      ['ocr_field_score_pct','OCR Field'],
                                      ['figure_format_score_pct','Figure'],
                                      ['cnn_image_score_pct','CNN Image']
                                    ].map(([key,label]) => {
                                      const pctVal = Number(((uploadResult as any).scores_breakdown[key as any] ?? 0))
                                      const pct = pctVal.toFixed(1)
                                      return (
                                        <div key={key as string}>
                                          <div className="flex justify-between"><span className="uppercase tracking-wide">{label}</span><span>{pct}%</span></div>
                                          <div className="h-2 bg-muted rounded"><div className="h-2 bg-primary rounded" style={{width: `${pct}%`}} /></div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* New: Display OCR Confidences */}
                          {(((typeof window !== 'undefined') && (localStorage.getItem('dev_mode') === '1'))) && uploadResult.ocr_confidences && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-foreground mb-2">OCR Confidences (per field):</p>
                              <ul className="text-sm text-muted-foreground">
                                {Object.entries(uploadResult.ocr_confidences).map(([field, conf]) => {
                                  const raw = typeof conf === 'string' ? parseFloat(String(conf).replace(/[^0-9.]/g, '')) : Number(conf);
                                  const normalized = Number.isFinite(raw) ? (raw <= 1 ? raw * 100 : raw) : 0;
                                  const pctStr = `${normalized.toFixed(1)}%`;
                                  const low = normalized < 90;
                                  const meaning = normalized > 95 ? 'Very reliable' : normalized >= 90 ? 'Slightly uncertain' : normalized >= 80 ? 'Moderate risk' : 'High risk';
                                  return (
                                    <li key={field} className={low ? 'text-red-600' : 'text-green-600'}>
                                      {field}: {pctStr} — {meaning}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}

                          {/* New: Display Field Anomalies */}
                          {(((typeof window !== 'undefined') && (localStorage.getItem('dev_mode') === '1'))) && uploadResult.field_anomalies && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-foreground mb-2">Field Validation Anomalies:</p>
                              <ul className="text-sm text-muted-foreground">
                                {Object.entries(uploadResult.field_anomalies).map(([field, anomaly]: [string, number]) => (
                                  <li key={field} className={anomaly > 0.5 ? 'text-red-600' : 'text-green-600'}>
                                    {field}: {(anomaly * 100).toFixed(1)}% anomaly
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* New: Field Validation Reasons */}
                          {(((typeof window !== 'undefined') && (localStorage.getItem('dev_mode') === '1'))) && uploadResult.field_validations && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-foreground mb-2">Field Validation Reasons:</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Object.entries(uploadResult.field_validations).map(([field, v]: [string, any]) => {
                                  const reasons: string[] = (v && v.reasons) || []
                                  if (!reasons.length) return null
                                  return (
                                    <div key={field} className="bg-white rounded-lg shadow p-3">
                                      <p className="text-sm font-semibold text-gray-900 mb-1">{field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                                        {reasons.map((r, idx) => (<li key={idx}>{r}</li>))}
                                      </ul>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* New: Display CNN Probability */}
                          {(((typeof window !== 'undefined') && (localStorage.getItem('dev_mode') === '1'))) && (uploadResult.cnn_probability !== undefined || (uploadResult as any).scores?.cnn_fraud_probability !== undefined) ? (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-foreground">
                                {(() => {
                                  const prob = uploadResult.cnn_probability ?? (uploadResult as any).scores?.cnn_fraud_probability ?? 0;
                                  return `CNN Image-Level Fraud Probability: ${(prob * 100).toFixed(1)}%`;
                                })()}
                              </p>
                              {Boolean((uploadResult as any).combined) && (
                                <p className="text-xs text-muted-foreground">Weights — OCR Character: {(uploadResult as any).combined?.weights?.ocr_character || 33}% · OCR Field: {(uploadResult as any).combined?.weights?.ocr_field || 33}% · CNN Image: {(uploadResult as any).combined?.weights?.cnn_image || 34}%</p>
                              )}
                            </div>
                          ) : null}

                          {(() => {
                            const b = (uploadResult as any).scores_breakdown || {};
                            const charPct = Number(b.ocr_character_score_pct || 0);
                            const fieldPct = Number(b.ocr_field_score_pct || 0);
                            const figPct = Number(b.figure_format_score_pct || 0);
                            const avgPct = (charPct + fieldPct + figPct) / 3;
                            const cnnPct = Number(b.cnn_image_score_pct || 0);
                            const riskPct = Number(((uploadResult as any).final_fraud_score ?? (uploadResult as any).final_anomaly_score ?? 0) * 100);
                            const showCnnPct = avgPct <= 75 ? (100 - cnnPct) : cnnPct;
                            const cnnClass = showCnnPct >= 95 ? 'text-green-600' : (showCnnPct >= 85 ? 'text-yellow-500' : 'text-red-600');
                            const ocrClass = avgPct >= 90 ? 'text-green-600' : (avgPct >= 80 ? 'text-yellow-500' : 'text-red-600');
                            return (
                              <div className="space-y-4">
                              <div className="rounded-2xl bg-panel backdrop-blur-md border border-white/10 shadow p-4">
                                  <p className="text-sm font-medium text-foreground mb-2">Fraud Scoring</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                      <p className="text-xs text-muted-foreground">Overall Fraud</p>
                                      {(() => {
                                        const lowMsg = 'WARNING GENERATED';
                                        const rs = String((((uploadResult as any).reasons || []) as string[]).join(' ')).toLowerCase();
                                        const restricted = (rs.includes('restriction') || rs.includes('unsupported') || rs.includes('not applicable'));
                                        if (restricted) return (<span className="text-red-600 text-sm font-semibold">----</span>);
                                        if (avgPct <= 75) return (<span className="text-sm font-semibold text-foreground">{lowMsg}</span>);
                                        if (avgPct <= 89) return (<span className="text-sm font-semibold text-foreground">APPEAL TO ADMIN TO REVIEW MANUALLY</span>);
                                        return (<p className="text-lg font-semibold text-foreground">{riskPct.toFixed(1)}%</p>);
                                      })()}
                                    </div>
                                    <div><p className="text-xs text-muted-foreground">CNN Score</p><p className={`text-lg font-semibold ${cnnClass}`}>{showCnnPct.toFixed(1)}%</p></div>
                                    <div><p className="text-xs text-muted-foreground">Average OCR Confidence</p><p className={`text-lg font-semibold ${ocrClass}`}>{avgPct.toFixed(1)}%</p></div>
                                  </div>
                                  {(showCnnPct >= 95 && avgPct < 90) && (
                                    <p className="text-xs text-muted-foreground mt-2">CNN confirms image authenticity. OCR is lower due to minor text extraction errors.</p>
                                  )}
                                </div>
                                <div className="bg-white rounded-lg shadow p-4">
                                  <p className="text-sm font-medium text-gray-900 mb-2">OCR Metrics</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div><p className="text-xs text-gray-700">Letter</p><p className="text-lg font-semibold text-gray-900">{charPct.toFixed(1)}%</p></div>
                                    <div><p className="text-xs text-gray-700">Word</p><p className="text-lg font-semibold text-gray-900">{fieldPct.toFixed(1)}%</p></div>
                                    <div><p className="text-xs text-gray-700">Figure</p><p className="text-lg font-semibold text-gray-900">{figPct.toFixed(1)}%</p></div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {uploadResult.extracted_data && (() => {
                            const ed = uploadResult.extracted_data as any;
                            const ctxLines: string[] = Array.isArray((ed as any).context_text) ? ((ed as any).context_text as string[]) : (((uploadResult as any).raw_lines as string[]) || []);
                            const rxPhone = /(\+?63\s?\d{3}\s?\d{3}\s?\d{4})/;
                            let senderNumber = String(ed.sender_number || '').trim();
                            const recvNorm = String(ed.receiver_number || '').replace(/\s+/g,'');
                            const sendNorm = senderNumber.replace(/\s+/g,'');
                            if (!sendNorm || sendNorm === recvNorm) {
                              let srcIdx = -1;
                              for (let i=0;i<ctxLines.length;i++){ if (String(ctxLines[i]||'').trim().toLowerCase()==='source'){ srcIdx=i; break; } }
                              if (srcIdx !== -1) {
                                for (let j=srcIdx+1;j<Math.min(ctxLines.length, srcIdx+12);j++){
                                  const m = String(ctxLines[j]||'').match(rxPhone);
                                  if (m){ const cand = m[1].replace(/\s+/g,''); if (cand !== recvNorm){ senderNumber = m[1]; break; } }
                                }
                              }
                              if ((!senderNumber || senderNumber.replace(/\s+/g,'')===recvNorm)){
                                for (const ln of ctxLines){ const m = String(ln||'').match(rxPhone); if (m){ const cand=m[1].replace(/\s+/g,''); if (cand!==recvNorm){ senderNumber=m[1]; break; } } }
                              }
                            }
                            const isGCash = String((uploadResult as any).platform || '').toLowerCase() === 'gcash';
                            const itemsSource: { label: string; value: any }[] = [
                              { label: 'Receiver Name', value: ed.receiver_name },
                              { label: 'Receiver Number', value: ed.receiver_number },
                              { label: 'Sender Name', value: ed.sender_wallet_or_name || ed.source },
                              { label: 'Sender Number', value: senderNumber },
                              { label: 'Amount', value: ed.amount },
                              { label: isGCash ? 'Ref No.' : 'Reference', value: ed.reference }
                            ];
                            const items: { label: string; value: any }[] = itemsSource
                              .filter((item) => !isGCash || item.label !== 'Receiver Name')
                              .filter((item) => item.value !== null && item.value !== undefined && String(item.value).trim() !== '');
                            if (items.length === 0) return null;
                            return (
                              <div className="mb-4">
                                <p className="text-sm font-medium text-foreground mb-2">Extracted Transaction Fields</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {items.map((item) => (
                                    <div key={item.label} className="rounded-2xl bg-panel backdrop-blur-md border border-border shadow p-3">
                                      <p className="text-xs text-muted-foreground">{item.label}</p>
                                      <p className="text-sm font-medium text-foreground">{String(item.value)}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {(((typeof window !== 'undefined') && (localStorage.getItem('dev_mode') === '1'))) && uploadResult.anomaly_details && uploadResult.anomaly_details.length > 0 && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-foreground mb-2">Detected Anomalies:</p>
                              <ul className="text-sm text-muted-foreground">
                                {uploadResult.anomaly_details.map((detail: string, idx: number) => (
                                  <li key={idx}>• {detail}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {(((typeof window !== 'undefined') && (localStorage.getItem('dev_mode') === '1'))) && Boolean((uploadResult as any).cnn_details?.platform_checks) && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-foreground mb-2">Platform Visual Consistency Checks:</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-muted-foreground">
                                {Object.entries(((uploadResult as any).cnn_details.platform_checks) as Record<string, number>)
                                  .map(([key, value]) => (
                                    <p key={key}>
                                      {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}: {(value * 100).toFixed(1)}%
                                    </p>
                                  ))}
                              </div>
                            </div>
                          )}

                          {(((typeof window !== 'undefined') && (localStorage.getItem('dev_mode') === '1'))) && uploadResult.explanation && (() => {
                            const lines = String(uploadResult.explanation).split('\n')
                            const section = (title: string, content: string[]) => (
                              <div className="mb-3">
                                <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {content.map((ln, idx) => (
                                    <li key={idx}>{ln}</li>
                                  ))}
                                </ul>
                              </div>
                            )
                            const parts: { [k: string]: string[] } = {}
                            let current = 'Summary'
                            parts[current] = []
                            for (const ln of lines) {
                              if (/^\s*$/.test(ln)) continue
                              if (ln.startsWith('Overall Fraud Score:')) current = 'Overall'
                              else if (ln.startsWith('Character Recognition:')) current = 'Character Recognition'
                              else if (ln.startsWith('Field Validation:')) current = 'Field Validation'
                              else if (ln.startsWith('Visual Analysis:')) current = 'Visual Analysis'
                              parts[current] = parts[current] || []
                              parts[current].push(ln.replace(/^\s+/, ''))
                            }
                            return (
                              <div className="mb-4 rounded-2xl bg-panel backdrop-blur-md border border-border shadow p-4">
                                {Object.entries(parts).map(([title, content]) => section(title, content))}
                              </div>
                            )
                          })()}

                          {(((typeof window !== 'undefined') && (localStorage.getItem('dev_mode') === '1'))) && uploadResult.extracted_data && (
                            <div className="space-y-6 text-base">
                              {Array.isArray((uploadResult.extracted_data as any).context_text) && (uploadResult.extracted_data as any).context_text.length > 0 && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-lg font-semibold text-foreground">Context Text</p>
                                    {Boolean((uploadResult as any).platform) && (
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${((uploadResult as any).platform === 'gcash') ? 'bg-gcash text-white' : 'bg-maya text-black'}`}>
                                        {String((uploadResult as any).platform).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="bg-white rounded-lg shadow p-4">
                                    <ul className="space-y-1 text-foreground font-mono text-[15px] leading-6">
                                      {((uploadResult.extracted_data as any).context_text as string[]).map((ln, idx) => (
                                        <li key={idx} className="whitespace-pre-wrap break-words">{ln}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}
                              <div>
                                <p className="text-lg font-semibold text-foreground">Extracted Data From Upload</p>
                                {Object.keys(uploadResult.extracted_data).length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No fields extracted</p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Object.entries(uploadResult.extracted_data)
                                      .filter(([key, v]) => key !== 'context_text' && v !== null && v !== undefined && String(v).trim() !== '')
                                      .map(([key, value]) => (
                                        <div key={key} className="rounded-2xl bg-panel backdrop-blur-md border border-border shadow p-3">
                                          <p className="text-xs text-muted-foreground">{key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                                          <p className="text-sm font-medium text-foreground">{String(value)}</p>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {Boolean((uploadResult as any).character_features) && (
                            <div className="space-y-4 mt-6">
                              <p className="text-lg font-semibold text-foreground">Character-Level Analysis</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-muted-foreground">
                                <p>Mean Confidence: {(((uploadResult as any).character_features?.mean_confidence || 0) * 100).toFixed(1)}%</p>
                                <p>Median Confidence: {(((uploadResult as any).character_features?.median_confidence || 0) * 100).toFixed(1)}%</p>
                                <p>Min Confidence: {(((uploadResult as any).character_features?.min_confidence || 0) * 100).toFixed(1)}%</p>
                                <p>Low-Confidence Count: {((uploadResult as any).character_features?.low_conf_count || 0)}</p>
                              </div>
                            </div>
                          )}

                          {Boolean((uploadResult as any).field_features) && (
                            <div className="space-y-4 mt-6">
                              <p className="text-lg font-semibold text-foreground">Field-Level Validation</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-muted-foreground">
                                <p>Reference Format: {((uploadResult as any).field_features?.regex_match?.reference_number ? 'Match' : 'No match')}</p>
                                <p>Phone Format: {((uploadResult as any).field_features?.regex_match?.phone ? 'Match' : 'No match')}</p>
                                <p>Amount Format: {((uploadResult as any).field_features?.regex_match?.amount ? 'Match' : 'No match')}</p>
                                <p>Date Plausible: {((uploadResult as any).field_features?.semantic_validation?.date_plausible ? 'Yes' : 'No')}</p>
                                <p>Amount In Range: {((uploadResult as any).field_features?.semantic_validation?.amount_range ? 'Yes' : 'No')}</p>
                                <p>GCash Amount Equals Total: {((uploadResult as any).field_features?.cross_consistency?.gcash_amount_equals_total ? 'Yes' : 'No')}</p>
                              </div>
                            </div>
                          )}

                          {Boolean((uploadResult as any).figure_features) && (
                            <div className="space-y-4 mt-6">
                              <p className="text-lg font-semibold text-foreground">Figure-Level Features</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-muted-foreground">
                                <p>Edge Density: {(((uploadResult as any).figure_features?.edge_density || 0).toFixed(4))}</p>
                                <p>Laplacian Variance: {(((uploadResult as any).figure_features?.laplacian_variance || 0).toFixed(2))}</p>
                              </div>
                            </div>
                          )}

                          {uploadResult.ocr_confidences && Object.values(uploadResult.ocr_confidences).some((conf: number) => conf < 90) && (
                            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
                              <p className="text-sm text-yellow-800">
                                Low OCR confidence detected in some fields. Consider re-uploading a clearer image or requesting a review.
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (activeTab as any) === 'history' ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground mb-6">Upload History</h2>
            {history.length === 0 ? (
              <div className="glass-card rounded-lg p-12 text-center animate-fade-in-up">
                <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No uploads yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                    <input value={historySearch} onChange={(e)=>setHistorySearch(e.target.value)} placeholder="Search history" className="pl-9 pr-3 py-2 border border-[#D9D9E3] rounded-lg text-sm w-64" />
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                    <select value={historySort} onChange={(e)=>setHistorySort(e.target.value as any)} className="border border-[#D9D9E3] rounded-lg text-sm py-2 px-2">
                      <option value="date_desc">Newest first</option>
                      <option value="date_asc">Oldest first</option>
                    </select>
                  </div>
                </div>
                {pageSlice.length === 0 ? (
                  <div className="glass-card rounded-lg p-12 text-center animate-fade-in-up">
                    <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No history items</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pageSlice.map((item:any) => (
                      <div key={item.id} className="glass-card rounded-lg p-6 animate-fade-in-up">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-foreground">{item.filename || 'Unknown'}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="capitalize">{String(item.platform||'N/A')}</span>
                              <span>•</span>
                              <span>{new Date(item.upload_date).toLocaleString()}</span>
                            </div>
                          </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeClass(String(item.status))}`}>
                            {String(item.status || '').replace('_',' ')}
                          </span>
                          <button title="Archive" onClick={() => archiveItem(Number(item.id))} className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F3F4F6]">
                            <Archive className="w-4 h-4 text-[#1E3E62]" />
                          </button>
                          <button title="Delete" onClick={() => deleteItem(Number(item.id))} className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F3F4F6]">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                        </div>
                        {appealUploadId === item.id ? null : (
                          <div className="mt-3">
                            <button onClick={() => setAppealUploadId(item.id)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#1E3E62] text-white text-xs hover:bg-[#1b3758]">
                              <AlertCircle className="w-4 h-4" />
                              <span>Request Review</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-muted-foreground">Page {historyPage} of {totalPages}</p>
                      <div className="flex items-center gap-2">
                        <button onClick={()=>setHistoryPage((p)=>Math.max(1,p-1))} disabled={historyPage<=1} className="px-3 py-1.5 text-xs rounded border border-[#D9D9E3] disabled:opacity-50">Prev</button>
                        <button onClick={()=>setHistoryPage((p)=>Math.min(totalPages,p+1))} disabled={historyPage>=totalPages} className="px-3 py-1.5 text-xs rounded border border-[#D9D9E3] disabled:opacity-50">Next</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'history' ? (
          <></>
        ) : activeTab === 'archive' ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Archive</h2>
            {archivedHistory.length === 0 ? (
              <div className="glass-card rounded-lg p-12 text-center animate-fade-in-up">
                <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No archived items</p>
              </div>
            ) : (
              <div className="space-y-4">
                {archivedHistory.map((item:any) => (
                  <div key={item.id} className="glass-card rounded-lg p-6 animate-fade-in-up">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{item.filename || 'Unknown'}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{String(item.platform||'N/A')}</span>
                          <span>•</span>
                          <span>{new Date(item.upload_date).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeClass(String(item.status))}`}>
                          {String(item.status || '').replace('_',' ')}
                        </span>
                        <button title="Restore" onClick={() => {
                          setArchivedIds((prev)=>{ const next = prev.filter((x)=>x!==Number(item.id)); try{ localStorage.setItem('user_history_archived_ids', JSON.stringify(next)) }catch{}; return next })
                          notify({ title: 'Restored', message: 'Item moved back to History', variant: 'success' })
                        }} className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F3F4F6] text-xs">Restore</button>
                        <button title="Delete" onClick={() => deleteItem(Number(item.id))} className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F3F4F6]">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground mb-6">Your Appeals</h2>
            {userAppeals.length === 0 ? (
              <div className="glass-card rounded-lg p-12 text-center animate-fade-in-up">
                <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No appeals submitted</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userAppeals.map((ap) => (
                  <div key={ap.id} className="glass-card rounded-lg p-6 animate-fade-in-up">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-semibold text-foreground">Upload ID: {ap.upload_id}</p>
                        <p className="text-sm text-muted-foreground">Created: {new Date(ap.created_at).toLocaleString()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        ap.status === 'approved' ? 'bg-green-100 text-green-800' : ap.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {String(ap.status).replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-muted-foreground">Your Reason</p>
                        <p className="font-medium text-foreground">{ap.reason}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Supervisor Response</p>
                        <p className="font-medium text-foreground">{ap.admin_response || '—'}</p>
                      </div>
                    </div>

                    {ap.resolved_at && (
                      <p className="text-xs text-muted-foreground">Resolved: {new Date(ap.resolved_at).toLocaleString()}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {appealUploadId !== null && (
        <>
          {(() => {
            const current = history.find((h:any) => h.id === appealUploadId)
            if (!current) {
              console.error('Missing upload item for appeal modal')
            }
            return null
          })()}
          {typeof document !== 'undefined' && (
            <Modal
              open={Boolean(appealUploadId)}
              title="Request Review"
              onClose={() => { setAppealUploadId(null); setAppealReason('') }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="bg-white rounded-xl shadow-2xl border border-[#1E3E62]/20 ring-1 ring-[#1E3E62]/10 p-3">
                    {history.find((h:any)=>h.id===appealUploadId)?.image_url ? (
                      <>
                        <img src={`${API_SERVER_URL}${history.find((h:any)=>h.id===appealUploadId)?.image_url}`} alt="Uploaded" className="w-full max-h-[420px] object-contain rounded-xl" />
                        <a href={`${API_SERVER_URL}${history.find((h:any)=>h.id===appealUploadId)?.image_url}`} target="_blank" rel="noopener noreferrer" className="text-[#1E3E62] hover:underline text-xs mt-2 inline-block">Open in new tab</a>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">Image not available</p>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Filename</p>
                      <p className="text-sm font-medium text-foreground">{history.find((h:any)=>h.id===appealUploadId)?.filename || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Platform</p>
                      <p className="text-sm font-medium text-foreground capitalize">{history.find((h:any)=>h.id===appealUploadId)?.platform || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Uploaded</p>
                      <p className="text-sm font-medium text-foreground">{history.find((h:any)=>h.id===appealUploadId)?.upload_date ? new Date(history.find((h:any)=>h.id===appealUploadId).upload_date).toLocaleString() : 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Extracted Content (OCR)</p>
                    <div className="bg-white rounded-xl shadow p-3">
                      {Array.isArray(history.find((h:any)=>h.id===appealUploadId)?.extracted_data?.context_text) ? (
                        <ul className="space-y-1 text-foreground font-mono text-[14px] leading-6">
                          {history.find((h:any)=>h.id===appealUploadId)?.extracted_data?.context_text.map((ln:string, idx:number)=>(
                            <li key={idx} className="whitespace-pre-wrap break-words">{ln}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground">OCR text unavailable</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Comment</label>
                    <textarea
                      value={appealReason}
                      onChange={(e) => setAppealReason(e.target.value)}
                      placeholder="Explain why you're appealing this result..."
                      className="w-full p-3 border border-[#D9D9E3] rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-[#1E3E62] min-h-[120px]"
                      rows={5}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => appealUploadId && handleAppeal(appealUploadId)}
                  className="px-4 py-2 bg-[#1E3E62] text-white rounded-lg hover:bg-[#1b3758] transition-colors"
                >
                  Submit Appeal
                </button>
                <button
                  onClick={() => { setAppealUploadId(null); setAppealReason('') }}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </Modal>
          )}
        </>
      )}
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
    </ErrorBoundary>
  )
}

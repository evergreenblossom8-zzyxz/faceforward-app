import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { 
  Moon, Sun, Heart, Plus, Trash2, LogOut, X, Bookmark, Layout, User, 
  Sparkles, PanelLeft, PanelRight, HelpCircle, Globe, Lock, 
  Link as LinkIcon, Youtube, Edit3, ArrowLeft, GitFork, 
  Clock, Upload, Check, ChevronDown, ChevronUp, Search, 
  ArrowUp, ArrowDown, Moon as MoonIcon, Loader2, Users, Copy, 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Flame, CheckCircle, 
  ShoppingBag, Share2, GripVertical
} from 'lucide-react'

// --- SUPABASE SETUP ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function FaceForwardApp() {
  // 1. STATE DEFINITIONS
  const [user, setUser] = useState(null)
  const [myProfile, setMyProfile] = useState(null) 
  
  // Data & Theme
  const [categoryView, setCategoryView] = useState('AM') 
  const [themeName, setThemeName] = useState('day') 

  // Main Data
  const [roadmaps, setRoadmaps] = useState([])
  const [savedIds, setSavedIds] = useState([]) 
  const [filteredRoadmaps, setFilteredRoadmaps] = useState([])
  
  // Interactions & Stats
  const [likedIds, setLikedIds] = useState([]) 
  const [likeCounts, setLikeCounts] = useState({}) 
  const [completions, setCompletions] = useState([]) 
  const [amStreak, setAmStreak] = useState(0)
  const [pmStreak, setPmStreak] = useState(0)

  // Navigation & UI
  const [searchQuery, setSearchQuery] = useState("")
  const [view, setView] = useState('roadmap') // 'roadmap' | 'profile' | 'calendar'
  const [activeRoadmap, setActiveRoadmap] = useState(null) 
  const [activeProfile, setActiveProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [navPosition, setNavPosition] = useState('top')
  const [expandedStepId, setExpandedStepId] = useState(null)
  const [modalConfig, setModalConfig] = useState(null) 
  
  // Form State
  const [formTitle, setFormTitle] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formTags, setFormTags] = useState("")
  const [formNumber, setFormNumber] = useState("") 
  const [formType, setFormType] = useState("product")
  const [formCategory, setFormCategory] = useState("AM")

  // Editing State
  const [editingTitleId, setEditingTitleId] = useState(null)
  const [editTitleVal, setEditTitleVal] = useState("")
  const [editTagsVal, setEditTagsVal] = useState("")
  const [editCategoryVal, setEditCategoryVal] = useState("")
  
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [copying, setCopying] = useState(false)
  
  // Drag & Drop Refs
  const dragItem = useRef(null)
  const dragOverItem = useRef(null)

  // 2. CRITICAL FUNCTIONS (HOISTED)
  function openCreateRoadmap() { 
      setFormTitle(""); setFormTags("")
      setFormCategory(categoryView === 'All' ? 'AM' : categoryView) 
      setModalConfig({ type: 'create_roadmap', title: 'Start New Routine' }) 
  }

  function openAddStep() { 
      setFormTitle(""); setFormDesc(""); setFormNumber("5")
      setModalConfig({ type: 'add_step', title: 'Add New Step' }) 
  }

  function openAddItem(stepId, type) { 
      setFormTitle(""); setFormDesc(""); setFormType(type)
      setModalConfig({ type: 'add_item', title: `Add ${type === 'product' ? 'Product' : 'Tutorial'}`, stepId })
  }

  function openEditProfile() { 
      setFormTitle(activeProfile?.username || ""); 
      setFormDesc(activeProfile?.bio || ""); 
      setModalConfig({ type: 'edit_profile', title: 'Edit Profile' }) 
  }

  function closeModal() { setModalConfig(null) }

  // 3. AUTH & LOAD EFFECTS
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
          setUser(session.user)
          fetchOrInitializeProfile(session.user)
      }
    })
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
          setUser(session.user)
          fetchOrInitializeProfile(session.user)
      } else {
          setUser(null); setMyProfile(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (user) fetchData() }, [categoryView, user])

  useEffect(() => {
      const lowerQ = searchQuery.toLowerCase()
      setFilteredRoadmaps(roadmaps.filter(r => 
          (r.title || "").toLowerCase().includes(lowerQ) || 
          (r.profiles?.username || "").toLowerCase().includes(lowerQ) ||
          (r.tags && r.tags.some(tag => tag.toLowerCase().includes(lowerQ)))
      ))
  }, [searchQuery, roadmaps])

  // 4. DATA LOGIC
  async function fetchOrInitializeProfile(currentUser) {
      if (!currentUser) return
      try {
        const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single()
        if (data) setMyProfile(data)
        else {
            const fallbackName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User'
            const { data: created } = await supabase.from('profiles').insert([{ id: currentUser.id, username: fallbackName, bio: 'Ready to glow.', avatar_url: currentUser.user_metadata?.avatar_url }]).select().single()
            if (created) setMyProfile(created)
        }
      } catch (e) { console.log("Profile Init Error:", e) }
  }

  async function fetchData() {
    if (!user) return; 
    setLoading(true)
    try {
      let query = supabase.from('roadmaps').select(`*, profiles (id, username, skin_type, avatar_url, bio), roadmap_steps (*, step_items (*))`).order('created_at', { ascending: false })
      if (categoryView !== 'All') query = query.eq('mode', categoryView)
      const { data: allRoadmaps, error } = await query
      if (error) throw error
      setRoadmaps(allRoadmaps || [])
      setFilteredRoadmaps(allRoadmaps || [])

      const { data: savedData } = await supabase.from('saved_roadmaps').select('roadmap_id').eq('user_id', user.id)
      setSavedIds(savedData?.map(item => item.roadmap_id) || [])

      const { data: allLikes } = await supabase.from('roadmap_likes').select('roadmap_id, user_id')
      setLikedIds(allLikes?.filter(l => l.user_id === user.id).map(l => l.roadmap_id) || [])
      const counts = {}; allLikes?.forEach(l => { counts[l.roadmap_id] = (counts[l.roadmap_id] || 0) + 1 }); setLikeCounts(counts)

      const { data: history } = await supabase.from('routine_completions').select('completed_at, roadmap_id').eq('user_id', user.id).order('completed_at', { ascending: false })
      setCompletions(history || [])
      calculateStreaks(history || [], allRoadmaps || [])

      // DEEP LINK CHECK
      const params = new URLSearchParams(window.location.search)
      const sharedId = params.get('roadmap')
      if (sharedId && allRoadmaps) {
          const found = allRoadmaps.find(r => r.id === sharedId)
          if (found) setActiveRoadmap(found)
      } else if (activeRoadmap && allRoadmaps.find(r => r.id === activeRoadmap.id)) {
          setActiveRoadmap(allRoadmaps.find(r => r.id === activeRoadmap.id)) 
      } else if (allRoadmaps && allRoadmaps.length > 0) {
          setActiveRoadmap(allRoadmaps[0])
      } else {
          setActiveRoadmap(null)
      }
    } catch (err) { console.error("Fetch Error:", err) } 
    finally { setLoading(false) }
  }

  function calculateStreaks(history, allRoadmaps) {
      if (!history || history.length === 0) { setAmStreak(0); setPmStreak(0); return }
      const amDates = new Set(); const pmDates = new Set()
      history.forEach(h => {
          const r = allRoadmaps.find(map => map.id === h.roadmap_id)
          if (r?.mode === 'AM') amDates.add(h.completed_at.split('T')[0])
          if (r?.mode === 'PM') pmDates.add(h.completed_at.split('T')[0])
      })
      setAmStreak(getStreakFromDates([...amDates]))
      setPmStreak(getStreakFromDates([...pmDates]))
  }

  function getStreakFromDates(datesArray) {
      if (datesArray.length === 0) return 0
      const days = datesArray.sort().reverse()
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      if (days[0] !== today && days[0] !== yesterday) return 0
      let currentStreak = 1; let currentDate = new Date(days[0])
      for (let i = 1; i < days.length; i++) {
          const prevDate = new Date(days[i])
          const diffDays = Math.ceil(Math.abs(currentDate - prevDate) / (1000 * 60 * 60 * 24)) 
          if (diffDays === 1) { currentStreak++; currentDate = prevDate } else { break }
      }
      return currentStreak
  }

  // 5. HELPER ACTIONS
  async function handleLogin() { await supabase.auth.signInWithOAuth({ provider: 'google' }) }
  async function handleLogout() { await supabase.auth.signOut(); setUser(null); window.location.reload() }

  function navigateToProfile(profile) { 
      const profileToView = profile || { id: user?.id, username: myProfile?.username || 'My Profile', bio: myProfile?.bio || 'Welcome!', avatar_url: myProfile?.avatar_url || user?.user_metadata?.avatar_url, isMe: true }
      if (user && profileToView.id === user.id) profileToView.isMe = true
      setActiveProfile(profileToView); setView('profile') 
  }
  
  function navigateToRoadmap(roadmap) { setActiveRoadmap(roadmap); setView('roadmap'); setExpandedStepId(null) }
  function toggleStepExpansion(stepId) { setExpandedStepId(expandedStepId === stepId ? null : stepId) }

  async function handleShare(roadmap) {
      const url = `${window.location.origin}?roadmap=${roadmap.id}`
      await navigator.clipboard.writeText(url)
      alert("Link copied to clipboard!")
  }

  async function handleSubmit() {
      if (!modalConfig) return
      if (modalConfig.type === 'create_roadmap') {
          if (!formTitle) return alert("Title required"); const tags = formTags ? formTags.split(',').map(t => t.trim()) : [];
          await supabase.from('roadmaps').insert([{ title: formTitle, user_id: user.id, mode: formCategory, is_public: false, is_template: false, tags }]); fetchData();
      }
      if (modalConfig.type === 'add_step') {
          await supabase.from('roadmap_steps').insert([{ roadmap_id: activeRoadmap.id, title: formTitle, notes: formDesc, step_order: 99, duration_minutes: parseInt(formNumber) || 0 }]); refreshActiveMap();
      }
      if (modalConfig.type === 'add_item') {
          await supabase.from('step_items').insert([{ step_id: modalConfig.stepId, title: formTitle, url: formDesc, item_type: formType }]); refreshActiveMap();
      }
      if (modalConfig.type === 'edit_profile') {
          await supabase.from('profiles').upsert({ id: user.id, username: formTitle, bio: formDesc }); fetchOrInitializeProfile(user);
          if (activeProfile && (activeProfile.id === user.id || activeProfile.isMe)) setActiveProfile(prev => ({ ...prev, username: formTitle, bio: formDesc, id: user.id, isMe: true }))
      }
      closeModal()
  }

  async function toggleLike(roadmapId) {
      const isLiked = likedIds.includes(roadmapId)
      if (isLiked) {
          setLikedIds(prev => prev.filter(id => id !== roadmapId))
          setLikeCounts(prev => ({ ...prev, [roadmapId]: Math.max(0, (prev[roadmapId] || 1) - 1) }))
          await supabase.from('roadmap_likes').delete().match({ user_id: user.id, roadmap_id: roadmapId })
      } else {
          setLikedIds(prev => [...prev, roadmapId])
          setLikeCounts(prev => ({ ...prev, [roadmapId]: (prev[roadmapId] || 0) + 1 }))
          await supabase.from('roadmap_likes').insert([{ user_id: user.id, roadmap_id: roadmapId }])
      }
  }

  async function logCompletion(roadmapId) {
      await supabase.from('routine_completions').insert([{ user_id: user.id, roadmap_id: roadmapId }])
      alert("Routine Complete! Streak updated."); fetchData() 
  }

  async function toggleSave(roadmapId) {
    if (savedIds.includes(roadmapId)) {
      await supabase.from('saved_roadmaps').delete().match({ user_id: user.id, roadmap_id: roadmapId }); setSavedIds(prev => prev.filter(id => id !== roadmapId))
    } else {
      await supabase.from('saved_roadmaps').insert([{ user_id: user.id, roadmap_id: roadmapId }]); setSavedIds(prev => [...prev, roadmapId])
    }
  }

  async function handleAvatarUpload(event) {
    try {
      setUploading(true); const file = event.target.files[0]; if (!file || !file.type.startsWith('image/')) return alert('Images only!');
      const filePath = `${user.id}/${Math.random()}.${file.name.split('.').pop()}`; await supabase.storage.from('avatars').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('profiles').upsert({ id: user.id, avatar_url: publicUrl }); fetchOrInitializeProfile(user);
      if (activeProfile && (activeProfile.id === user.id || activeProfile.isMe)) setActiveProfile(prev => ({ ...prev, avatar_url: publicUrl }))
    } catch (error) { alert(error.message) } finally { setUploading(false) }
  }

  async function saveTitle(roadmapId) {
      const tags = editTagsVal.split(',').map(t => t.trim()); await supabase.from('roadmaps').update({ title: editTitleVal, tags, mode: editCategoryVal }).eq('id', roadmapId); setEditingTitleId(null); fetchData();
      if(activeRoadmap.id === roadmapId) setActiveRoadmap(prev => ({...prev, title: editTitleVal, tags, mode: editCategoryVal}))
  }

  function startEditingTitle(roadmap) { setEditTitleVal(roadmap.title); setEditTagsVal(roadmap.tags ? roadmap.tags.join(', ') : ""); setEditCategoryVal(roadmap.mode || 'AM'); setEditingTitleId(roadmap.id) }

  async function togglePrivacy(roadmap) {
    const newStatus = !roadmap.is_public; await supabase.from('roadmaps').update({ is_public: newStatus }).eq('id', roadmap.id); fetchData();
    setActiveRoadmap(prev => ({ ...prev, is_public: newStatus }))
  }

  async function handleFork(originalRoadmap) {
    if (!user) return alert("Please login!"); setCopying(true)
    try {
        const { data: newRoadmap, error } = await supabase.from('roadmaps').insert([{ title: `${originalRoadmap.title} (Copy)`, user_id: user.id, mode: originalRoadmap.mode, is_public: false, is_template: false, tags: originalRoadmap.tags || [] }]).select().single()
        if (error) throw error
        if (originalRoadmap.roadmap_steps?.length > 0) {
            for (const step of originalRoadmap.roadmap_steps) {
                const { data: newStep, error: stepError } = await supabase.from('roadmap_steps').insert([{ roadmap_id: newRoadmap.id, title: step.title, notes: step.notes, step_order: step.step_order, duration_minutes: step.duration_minutes }]).select().single()
                if (stepError) continue
                if (step.step_items?.length > 0) {
                    const itemsToInsert = step.step_items.map(item => ({ step_id: newStep.id, title: item.title, url: item.url, item_type: item.item_type }))
                    await supabase.from('step_items').insert(itemsToInsert)
                }
            }
        }
        alert("Routine added to your library!"); fetchData()
    } catch (e) { alert("Failed to copy: " + e.message) } finally { setCopying(false) }
  }

  async function deleteRoadmap(id) {
    if (!confirm("Delete routine?")) return; await supabase.from('roadmap_steps').delete().eq('roadmap_id', id); await supabase.from('roadmaps').delete().eq('id', id);
    if (activeRoadmap?.id === id) setActiveRoadmap(null); fetchData()
  }

  async function deleteItem(itemId) { if(!confirm("Remove item?")) return; await supabase.from('step_items').delete().eq('id', itemId); refreshActiveMap() }
  async function deleteStep(stepId) { if (!confirm("Remove step?")) return; await supabase.from('roadmap_steps').delete().eq('id', stepId); refreshActiveMap() }
  async function refreshActiveMap() { const { data } = await supabase.from('roadmaps').select(`*, profiles(username, skin_type), roadmap_steps(*, step_items(*))`).eq('id', activeRoadmap.id).single(); if(data) setActiveRoadmap(data) }
  function calculateTotalTime(roadmap) { return roadmap.roadmap_steps?.reduce((acc, step) => acc + (step.duration_minutes || 0), 0) || 0 }

  // Drag & Drop Handlers
  const handleDragStart = (e, position) => { dragItem.current = position }
  const handleDragEnter = (e, position) => { dragOverItem.current = position }
  const handleDragEnd = async () => {
      if (!activeRoadmap) return
      const sortedSteps = [...activeRoadmap.roadmap_steps].sort((a,b) => a.step_order - b.step_order)
      const dragItemContent = sortedSteps[dragItem.current]
      sortedSteps.splice(dragItem.current, 1)
      sortedSteps.splice(dragOverItem.current, 0, dragItemContent)
      dragItem.current = null; dragOverItem.current = null
      const updatedSteps = sortedSteps.map((step, index) => ({ ...step, step_order: index + 1 }))
      setActiveRoadmap({ ...activeRoadmap, roadmap_steps: updatedSteps })
      for (const step of updatedSteps) { await supabase.from('roadmap_steps').update({ step_order: step.step_order }).eq('id', step.id) }
  }

  // 6. THEME CONFIG
  const themes = {
    day: { bg: { backgroundColor: '#f7f7f7', backgroundImage: `radial-gradient(at 40% 20%, hsla(28,100%,74%,0.1) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(340,100%,76%,0.1) 0px, transparent 50%)` }, text: 'text-stone-800', glassPanel: "bg-white/60 backdrop-blur-xl border-white/40 shadow-xl", glassCard: "bg-white/60 border-white/60 hover:bg-white/90 shadow-sm", activeState: "ring-2 ring-amber-400 bg-white/90", accent: "text-amber-600", button: "bg-stone-900 text-white" },
    night: { bg: { backgroundColor: '#0f0f0f', backgroundImage: `radial-gradient(at 10% 10%, hsla(260, 50%, 20%, 0.4) 0px, transparent 50%), radial-gradient(at 90% 90%, hsla(300, 50%, 15%, 0.4) 0px, transparent 50%), radial-gradient(at 90% 90%, hsla(300, 50%, 15%, 0.4) 0px, transparent 50%)` }, text: 'text-slate-200', glassPanel: "bg-black/60 backdrop-blur-xl border-white/5 shadow-2xl", glassCard: "bg-white/5 border-white/5 hover:bg-white/10 hover:border-purple-500/50", activeState: "ring-1 ring-purple-500 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.15)]", accent: "text-purple-400", button: "bg-white text-black" },
    valentine: { bg: { backgroundColor: '#fff0f5', backgroundImage: `radial-gradient(at 30% 30%, hsla(340, 100%, 85%, 0.4) 0px, transparent 60%), radial-gradient(at 80% 80%, hsla(350, 100%, 90%, 0.6) 0px, transparent 50%)` }, text: 'text-pink-900', glassPanel: "bg-white/60 backdrop-blur-xl border-white/40 shadow-xl shadow-pink-200/20", glassCard: "bg-white/60 border-pink-100 hover:bg-pink-50 hover:border-pink-300 shadow-sm", activeState: "ring-2 ring-pink-400 bg-pink-50", accent: "text-pink-500", button: "bg-pink-500 text-white shadow-pink-300/50" }
  }
  const currentTheme = themes[themeName]

  // --- RENDER ---
  if (!user) return <LandingPage handleLogin={handleLogin} currentTheme={currentTheme} />

  const navClasses = navPosition === 'top' ? `h-16 border-b flex items-center justify-between px-6 flex-shrink-0 z-50 ${currentTheme.glassPanel} border-white/20 order-first` : `h-16 border-t flex items-center justify-between px-6 flex-shrink-0 z-50 ${currentTheme.glassPanel} border-white/20 order-last`

  return (
    <div className={`h-screen flex flex-col font-sans overflow-hidden transition-all duration-700 ${currentTheme.text}`} style={currentTheme.bg}>
      
      <header className={navClasses}>
        <div className="flex items-center gap-4">
            <div className="flex gap-1"><button onClick={() => setLeftOpen(!leftOpen)} className={`p-2 rounded-lg transition-colors hover:bg-black/5`}><PanelLeft size={18} className="opacity-70"/></button><button onClick={() => setRightOpen(!rightOpen)} className={`p-2 rounded-lg transition-colors hidden lg:block hover:bg-black/5`}><PanelRight size={18} className="opacity-70"/></button></div>
            <div className="flex items-center bg-black/5 dark:bg-white/10 p-1 rounded-lg ml-2">{['All', 'AM', 'PM', 'Event'].map(cat => (<button key={cat} onClick={() => setCategoryView(cat)} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${categoryView === cat ? 'bg-white shadow text-black' : 'opacity-50'}`}>{cat}</button>))}</div>
        </div>
        <div className="flex items-center gap-3 relative">
           <button onClick={() => setNavPosition(navPosition === 'top' ? 'bottom' : 'top')} className="p-2 rounded-full hover:bg-black/5 opacity-60"><ArrowDown size={18} className={navPosition === 'bottom' ? 'rotate-180' : ''}/></button>
           <div className="flex items-center gap-2 bg-black/5 dark:bg-white/10 px-3 py-1 rounded-full border border-black/5 backdrop-blur-md"><Flame size={14} className="text-orange-500" fill="currentColor"/><span className="text-xs font-bold">{amStreak + pmStreak}</span></div>
           <div className="flex gap-1 bg-black/5 dark:bg-white/10 p-1 rounded-full border border-black/5 backdrop-blur-md">
              <button onClick={() => setThemeName('day')} className={`p-2 rounded-full transition-all ${themeName === 'day' ? 'bg-white shadow text-amber-500' : 'opacity-40 hover:opacity-100'}`}><Sun size={14}/></button>
              <button onClick={() => setThemeName('night')} className={`p-2 rounded-full transition-all ${themeName === 'night' ? 'bg-slate-800 shadow text-purple-400' : 'opacity-40 hover:opacity-100'}`}><MoonIcon size={14}/></button>
              <button onClick={() => setThemeName('valentine')} className={`p-2 rounded-full transition-all ${themeName === 'valentine' ? 'bg-pink-100 shadow text-pink-500' : 'opacity-40 hover:opacity-100'}`}><Heart size={14}/></button>
           </div>
           <button onClick={() => setView('calendar')} className={`p-2 rounded-full hover:bg-black/5 ${view === 'calendar' ? 'bg-black/10' : ''}`} title="View Calendar"><CalendarIcon size={18}/></button>
           <button onClick={() => navigateToProfile(myProfile)} className="ml-2 w-8 h-8 rounded-full bg-gradient-to-r from-stone-200 to-stone-300 overflow-hidden border border-white/50"><img src={myProfile?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${user?.id}`} alt="Me" className="w-full h-full object-cover"/> </button>
        </div>
      </header>

      {modalConfig && (
        <Modal theme={currentTheme} onClose={closeModal} title={modalConfig.title}>
            {modalConfig.type === 'create_roadmap' && (<><input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Routine Name" className="w-full p-4 mb-4 rounded-xl bg-black/5 border-none outline-none"/><div className="flex gap-2 mb-4">{['AM', 'PM', 'Everyday', 'Event'].map(cat => (<button key={cat} onClick={() => setFormCategory(cat)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formCategory === cat ? 'bg-black/80 text-white' : 'bg-black/5 opacity-50'}`}>{cat}</button>))}</div><input value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="Tags (e.g. Oily, Budget)" className="w-full p-4 mb-6 rounded-xl bg-black/5 border-none outline-none"/></>)}
            {modalConfig.type === 'add_step' && (<><input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Step Title" className="w-full p-4 mb-4 rounded-xl bg-black/5 border-none outline-none"/><textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Description" className="w-full p-4 mb-4 rounded-xl bg-black/5 border-none outline-none min-h-[80px]"/><input value={formNumber} onChange={e => setFormNumber(e.target.value)} type="number" placeholder="Duration (min)" className="w-full p-4 mb-6 rounded-xl bg-black/5 border-none outline-none"/></>)}
            {modalConfig.type === 'add_item' && (<><input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder={formType === 'product' ? "Product Name" : "Video Title"} className="w-full p-4 mb-4 rounded-xl bg-black/5 border-none outline-none"/><input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="URL Link" className="w-full p-4 mb-6 rounded-xl bg-black/5 border-none outline-none"/></>)}
            {modalConfig.type === 'edit_profile' && (<><input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Username" className="w-full p-4 mb-4 rounded-xl bg-black/5 border-none outline-none"/><textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Bio" className="w-full p-4 mb-6 rounded-xl bg-black/5 border-none outline-none min-h-[100px]"/></>)}
            <button onClick={handleSubmit} className={`w-full py-4 rounded-xl font-bold ${currentTheme.button}`}>Save</button>
        </Modal>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        <aside className={`border-r flex flex-col transition-all duration-300 ease-in-out z-40 ${currentTheme.glassPanel} border-white/20 ${leftOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full opacity-0'}`}>
          <div className="p-4 pb-0"><div className="flex items-center bg-black/5 dark:bg-white/10 rounded-lg px-3 py-2"><Search size={14} className="opacity-50 mr-2"/><input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-xs w-full" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div></div>
          <div className="flex-1 overflow-y-auto">
              <div className="p-4 border-b border-black/5 dark:border-white/5"><h2 className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4 flex items-center gap-2"><Users size={12}/> Discover & Templates</h2>{loading ? <div className="p-4 text-center opacity-50"><Loader2 className="animate-spin inline"/></div> : (<div className="space-y-3">{filteredRoadmaps.filter(r => (r.is_template || r.is_public) && r.user_id !== user?.id).map(r => (<RoadmapCard key={r.id} r={r} theme={currentTheme} active={activeRoadmap?.id === r.id} onClick={() => navigateToRoadmap(r)} onProfileClick={() => navigateToProfile(r.profiles)} calculateTotalTime={calculateTotalTime} likeCount={likeCounts[r.id] || 0} isLiked={likedIds.includes(r.id)} />))}{filteredRoadmaps.filter(r => (r.is_template || r.is_public) && r.user_id !== user?.id).length === 0 && <p className="text-xs opacity-40 italic">No community routines found.</p>}</div>)}</div>
              <div className="p-4"><h2 className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4 flex items-center gap-2"><Bookmark size={12}/> Saved Library</h2><div className="space-y-3">{filteredRoadmaps.filter(r => savedIds.includes(r.id)).map(r => (<RoadmapCard key={r.id} r={r} theme={currentTheme} active={activeRoadmap?.id === r.id} onClick={() => navigateToRoadmap(r)} onProfileClick={() => navigateToProfile(r.profiles)} calculateTotalTime={calculateTotalTime} likeCount={likeCounts[r.id] || 0} isLiked={likedIds.includes(r.id)} />))}</div></div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative z-10 w-full">
           {view === 'roadmap' && activeRoadmap ? (
             <div className="max-w-3xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className={`p-8 rounded-[2rem] mb-8 border backdrop-blur-md shadow-xl text-center relative overflow-hidden ${currentTheme.glassPanel} border-white/20`}>
                 <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${themeName === 'day' ? 'from-amber-200 via-white to-amber-200' : themeName === 'valentine' ? 'from-pink-300 via-white to-pink-300' : 'from-purple-500 via-blue-500 to-purple-500'}`}></div>
                 <div className="flex justify-center items-center gap-3 mb-4 flex-wrap"><span className="text-[10px] font-bold uppercase tracking-widest opacity-60 border border-current px-3 py-1 rounded-full">{activeRoadmap.mode || 'Routine'}</span><span className="text-[10px] font-bold uppercase tracking-widest opacity-60 border border-current px-3 py-1 rounded-full">{activeRoadmap.profiles?.skin_type || 'General'}</span><span className="text-[10px] font-bold uppercase tracking-widest opacity-60 bg-black/5 dark:bg-white/10 px-3 py-1 rounded-full flex items-center gap-1"><Clock size={10}/> {calculateTotalTime(activeRoadmap)} min</span>{(activeRoadmap.tags || []).map(tag => <span key={tag} className="text-[10px] font-bold uppercase tracking-widest opacity-60 bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full">#{tag}</span>)}{user?.id === activeRoadmap.user_id && (<button onClick={() => togglePrivacy(activeRoadmap)} className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${activeRoadmap.is_public ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{activeRoadmap.is_public ? <Globe size={10} /> : <Lock size={10} />}{activeRoadmap.is_public ? 'Public' : 'Private'}</button>)}</div>
                 {editingTitleId === activeRoadmap.id ? (
                     <div className="flex flex-col items-center justify-center gap-2 mb-2"><input value={editTitleVal} onChange={(e) => setEditTitleVal(e.target.value)} className="text-4xl font-serif font-bold text-center bg-transparent border-b-2 border-current outline-none w-full max-w-md" autoFocus /><div className="flex gap-1">{['AM', 'PM', 'Everyday', 'Event'].map(cat => (<button key={cat} onClick={() => setEditCategoryVal(cat)} className={`px-2 py-1 rounded text-[10px] font-bold ${editCategoryVal === cat ? 'bg-black text-white' : 'bg-black/5'}`}>{cat}</button>))}</div><input value={editTagsVal} onChange={(e) => setEditTagsVal(e.target.value)} placeholder="Tags..." className="text-sm text-center bg-transparent border-b border-gray-400 outline-none w-full max-w-xs mt-2" /><button onClick={() => saveTitle(activeRoadmap.id)} className="p-2 bg-green-500 text-white rounded-full mt-2"><Check size={20}/></button></div>
                 ) : (
                    <div className="flex items-center justify-center gap-2 mb-2 group"><h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">{activeRoadmap.title}</h1>{user?.id === activeRoadmap.user_id && <button onClick={() => { startEditingTitle(activeRoadmap); setEditingTitleId(activeRoadmap.id) }} className="opacity-50 hover:opacity-100 transition-opacity p-2 text-gray-400 hover:text-black dark:hover:text-white"><Edit3 size={16}/></button>}</div>
                 )}
                 <button onClick={() => navigateToProfile(activeRoadmap.profiles)} className="flex justify-center items-center gap-2 text-sm opacity-60 font-medium hover:opacity-100 hover:underline transition-all mx-auto"><User size={14}/> {activeRoadmap.profiles?.username || 'User'}</button>
                 <div className="flex justify-center gap-4 mt-8 flex-wrap"><button onClick={() => toggleLike(activeRoadmap.id)} className={`flex items-center gap-2 px-6 py-3 rounded-full border transition-all active:scale-95 ${likedIds.includes(activeRoadmap.id) ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'hover:bg-white/10'}`}><Heart size={18} fill={likedIds.includes(activeRoadmap.id) ? "currentColor" : "none"} /> {likeCounts[activeRoadmap.id] || 0}</button><button onClick={() => toggleSave(activeRoadmap.id)} className={`flex items-center gap-2 px-6 py-3 rounded-full border transition-all active:scale-95 ${savedIds.includes(activeRoadmap.id) ? 'bg-blue-500/10 border-blue-500/50 text-blue-500' : 'hover:bg-white/10'}`}><Bookmark size={18} fill={savedIds.includes(activeRoadmap.id) ? "currentColor" : "none"} /> {savedIds.includes(activeRoadmap.id) ? 'Saved' : 'Save'}</button><button onClick={() => logCompletion(activeRoadmap.id)} className="flex items-center gap-2 px-6 py-3 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 hover:bg-green-500/20 transition-all font-bold"><CheckCircle size={18} /> I Did It!</button><button onClick={() => handleShare(activeRoadmap)} className="p-3 rounded-full hover:bg-black/5" title="Share Link"><Share2 size={18}/></button>{user?.id !== activeRoadmap.user_id && (<button onClick={() => handleFork(activeRoadmap)} className={`p-3 rounded-full hover:bg-black/5 transition-all ${copying ? 'opacity-50 cursor-wait' : ''}`} title="Copy to my Library">{copying ? <Loader2 size={18} className="animate-spin"/> : <Copy size={18}/>}</button>)}{user?.id === activeRoadmap.user_id && <button onClick={() => deleteRoadmap(activeRoadmap.id)} className="p-3 rounded-full hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>}</div>
               </div>
               <div className="space-y-4">
                 {activeRoadmap.roadmap_steps?.sort((a,b) => a.step_order - b.step_order).map((step, i) => (
                    <div 
                        key={step.id} 
                        className={`rounded-3xl border relative group transition-all duration-300 overflow-hidden ${currentTheme.glassCard}`}
                        draggable={user?.id === activeRoadmap.user_id}
                        onDragStart={(e) => handleDragStart(e, i)}
                        onDragEnter={(e) => handleDragEnter(e, i)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                    >
                       <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={() => toggleStepExpansion(step.id)}>
                           <div className="flex items-center gap-4">
                               {user?.id === activeRoadmap.user_id && <GripVertical size={16} className="opacity-30 cursor-grab"/>}
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-mono text-lg shadow-lg ${themeName === 'day' ? 'bg-stone-800 text-white border-4 border-stone-50' : 'bg-white text-black border-4 border-slate-900'}`}>{i + 1}</div>
                               <div><h3 className="font-bold text-xl">{step.title}</h3><div className="text-[10px] opacity-40 font-bold uppercase tracking-widest flex items-center gap-1 mt-1"><Clock size={10}/> {step.duration_minutes || 0}m</div></div>
                           </div>
                           <button className="opacity-50">{expandedStepId === step.id ? <ChevronUp/> : <ChevronDown/>}</button>
                       </div>
                       <div className={`grid transition-all duration-500 ease-in-out ${expandedStepId === step.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}><div className="overflow-hidden"><div className="p-6 pt-0">{step.notes && <p className="text-base opacity-70 italic font-serif leading-relaxed border-l-2 border-current pl-4 my-4">"{step.notes}"</p>}<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6"><div className="bg-black/5 dark:bg-white/5 rounded-xl p-4"><h4 className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-3">My Kit (Affiliate Links)</h4><div className="space-y-2">{step.step_items?.filter(item => item.item_type === 'product').map(item => (<div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-white/50 dark:bg-black/20 hover:bg-white/80 transition-colors"><a href={item.url} target="_blank" className="flex items-center gap-2 hover:text-blue-500 truncate"><div className="p-1.5 rounded-full bg-amber-100 text-amber-600"><ShoppingBag size={12}/></div><span className="text-xs font-bold opacity-90 truncate max-w-[150px]">{item.title}</span></a>{user?.id === activeRoadmap.user_id && <button onClick={() => deleteItem(item.id)} className="text-red-300 hover:text-red-500"><X size={12}/></button>}</div>))}{user?.id === activeRoadmap.user_id && (<button onClick={() => openAddItem(step.id, 'product')} className="w-full py-2 border-2 border-dashed border-black/10 rounded-lg text-[10px] font-bold opacity-50 hover:opacity-100 hover:bg-white/20 transition-all">+ Add Product</button>)}</div></div><div className="bg-blue-500/5 rounded-xl p-4"><h4 className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-3 text-blue-500">Tutorials</h4><div className="space-y-2">{step.step_items?.filter(item => item.item_type === 'tutorial').map(item => (<div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-white/50 dark:bg-black/20 hover:bg-white/80 transition-colors"><a href={item.url} target="_blank" className="flex items-center gap-2 hover:text-blue-500 truncate"><div className="p-1.5 rounded-full bg-blue-100 text-blue-600"><Youtube size={12}/></div><span className="text-xs font-bold opacity-90 truncate max-w-[150px]">{item.title}</span></a>{user?.id === activeRoadmap.user_id && <button onClick={() => deleteItem(item.id)} className="text-red-300 hover:text-red-500"><X size={12}/></button>}</div>))}{user?.id === activeRoadmap.user_id && (<button onClick={() => openAddItem(step.id, 'tutorial')} className="w-full py-2 border-2 border-dashed border-blue-500/20 text-blue-500 rounded-lg text-[10px] font-bold opacity-50 hover:opacity-100 hover:bg-blue-500/10 transition-all">+ Add Video</button>)}</div></div></div><div className="flex justify-end mt-6 pt-4 border-t border-black/10 dark:border-white/10">{user?.id === activeRoadmap.user_id && (<button onClick={() => deleteStep(step.id)} className="text-xs font-bold text-red-400 hover:text-red-500 flex items-center gap-1"><Trash2 size={14}/> Remove Step</button>)}</div></div></div></div></div>
                 ))}
               </div>
               {user?.id === activeRoadmap.user_id && (<button onClick={openAddStep} className="w-full py-6 mt-8 border-2 border-dashed rounded-3xl opacity-40 hover:opacity-100 font-bold flex justify-center items-center gap-3 transition-all hover:border-current hover:bg-white/5"><Plus size={20}/> Add Next Step</button>)}
             </div>
           ) : view === 'calendar' ? (
             <CalendarView 
                completions={completions} 
                roadmaps={roadmaps} 
                theme={currentTheme} 
                amStreak={amStreak}
                pmStreak={pmStreak}
                onBack={() => setView('roadmap')}
             />
           ) : view === 'profile' && activeProfile ? (
             <div className="max-w-2xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button onClick={() => setView('roadmap')} className="mb-6 flex items-center gap-2 text-sm font-bold opacity-50 hover:opacity-100"><ArrowLeft size={16}/> Back</button>
                <div className={`p-12 rounded-[3rem] text-center border ${currentTheme.glassPanel} border-white/20`}>
                    <div className="w-32 h-32 mx-auto rounded-full p-1 bg-gradient-to-tr from-amber-300 to-purple-400 mb-6 relative group"><img src={activeProfile.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${activeProfile.id}`} className="w-full h-full rounded-full object-cover bg-white" />{(activeProfile.isMe || activeProfile.id === user?.id) && (<div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current.click()}><Upload className="text-white" size={24} /><input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} /></div>)}</div>
                    <h1 className="text-4xl font-serif font-bold mb-2">{activeProfile.username || 'User'}</h1>
                    <p className="opacity-60 max-w-sm mx-auto mb-6">{activeProfile.bio || 'No bio yet.'}</p>
                    {(activeProfile.isMe || activeProfile.id === user?.id) && (<button onClick={openEditProfile} className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-black/10 hover:bg-black/5 text-sm font-bold"><Edit3 size={14}/> Edit Profile</button>)}
                    <div className="mt-12 text-left"><h3 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-4 text-center">Public Routines</h3><div className="grid gap-3">{roadmaps.filter(r => r.user_id === activeProfile.id && (r.is_public || activeProfile.id === user?.id)).map(r => (<RoadmapCard key={r.id} r={r} theme={currentTheme} active={false} onClick={() => navigateToRoadmap(r)} calculateTotalTime={calculateTotalTime} onProfileClick={() => {}} likeCount={likeCounts[r.id] || 0} isLiked={likedIds.includes(r.id)} />))}{roadmaps.filter(r => r.user_id === activeProfile.id && (r.is_public || activeProfile.id === user?.id)).length === 0 && <p className="text-center opacity-40 italic text-sm">No public routines yet.</p>}</div></div>
                </div>
             </div>
           ) : (<div className="h-full flex flex-col items-center justify-center opacity-40"><div className={`p-8 rounded-full mb-6 ${themeName === 'day' ? 'bg-white/50' : 'bg-white/5'}`}><Layout size={64} className="opacity-50"/></div><p className="text-xl font-serif italic">No routines found for {categoryView} mode.</p><button onClick={openCreateRoadmap} className="mt-4 text-xs font-bold underline hover:opacity-100">Create one?</button></div>)}
        </main>

        <aside className={`border-l p-4 overflow-y-auto hidden lg:block z-40 transition-all duration-300 ease-in-out ${currentTheme.glassPanel} border-white/20 ${rightOpen ? 'w-80 translate-x-0' : 'w-0 translate-x-full opacity-0 p-0 overflow-hidden'}`}>
          <div className="flex justify-between items-center mb-6 min-w-[18rem] flex-shrink-0"><h2 className="text-[10px] font-bold uppercase tracking-widest opacity-50">My Routines</h2><button onClick={openCreateRoadmap} className={`p-2 rounded-full transition-transform hover:rotate-90 hover:bg-black/5 dark:hover:bg-white/10 ${themeName === 'night' ? 'text-purple-400' : ''}`}><Plus size={18}/></button></div>
          <div className="flex-1 overflow-y-auto space-y-4">{filteredRoadmaps.filter(r => r.user_id === user?.id).map(r => (<RoadmapCard key={r.id} r={r} theme={currentTheme} active={activeRoadmap?.id === r.id} onClick={() => navigateToRoadmap(r)} onProfileClick={() => navigateToProfile(r.profiles)} calculateTotalTime={calculateTotalTime} likeCount={likeCounts[r.id] || 0} isLiked={likedIds.includes(r.id)} />))}</div>
          <div className="mt-auto pt-4 border-t border-black/5 dark:border-white/5 min-w-[18rem] flex-shrink-0"><button onClick={handleLogout} className="w-full py-3 rounded-xl flex justify-center items-center gap-2 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"><LogOut size={14}/> Sign Out</button></div>
        </aside>
      </div>
    </div>
  )
}

function CalendarView({ completions, roadmaps, theme, amStreak, pmStreak, onBack }) {
    const [date, setDate] = useState(new Date())
    const year = date.getFullYear()
    const month = date.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()
    
    const completionsByDay = {}
    completions.forEach(c => {
        const d = c.completed_at.split('T')[0]
        if (!completionsByDay[d]) completionsByDay[d] = []
        completionsByDay[d].push(c)
    })

    function getDayStatus(day) {
        const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const comps = completionsByDay[dStr] || []
        let hasAM = false
        let hasPM = false
        
        comps.forEach(c => {
            const r = roadmaps.find(rm => rm.id === c.roadmap_id)
            if (r?.mode === 'AM') hasAM = true
            if (r?.mode === 'PM') hasPM = true
        })
        return { hasAM, hasPM }
    }

    return (
        <div className="max-w-2xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-bold opacity-50 hover:opacity-100"><ArrowLeft size={16}/> Back</button>
            <div className={`p-8 rounded-[2rem] border ${theme.glassPanel} border-white/20`}>
                <div className="flex justify-between items-center mb-8">
                    <button onClick={() => setDate(new Date(year, month - 1))} className="p-2 hover:bg-black/5 rounded-full"><ChevronLeft/></button>
                    <h2 className="text-2xl font-serif font-bold">{date.toLocaleDateString('default', { month: 'long', year: 'numeric' })}</h2>
                    <button onClick={() => setDate(new Date(year, month + 1))} className="p-2 hover:bg-black/5 rounded-full"><ChevronRight/></button>
                </div>
                
                <div className="grid grid-cols-7 gap-2 mb-4 text-center">
                    {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className="text-xs font-bold opacity-30">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2 text-center">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1
                        const status = getDayStatus(day)
                        return (
                            <div key={day} className="flex flex-col items-center justify-start h-14 p-1 rounded-xl hover:bg-black/5 transition-colors border border-transparent hover:border-black/5">
                                <span className="text-xs opacity-50 mb-1">{day}</span>
                                <div className="flex gap-1">
                                    <div className={`w-2 h-2 rounded-full ${status.hasAM ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'bg-black/5'}`}></div>
                                    <div className={`w-2 h-2 rounded-full ${status.hasPM ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'bg-black/5'}`}></div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-black/5">
                    <div className="text-center p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                        <div className="text-3xl font-bold text-amber-600 mb-1">{amStreak}</div>
                        <div className="text-[10px] uppercase font-bold opacity-60 tracking-widest flex items-center justify-center gap-1">AM Streak</div>
                    </div>
                    <div className="text-center p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                        <div className="text-3xl font-bold text-purple-600 mb-1">{pmStreak}</div>
                        <div className="text-[10px] uppercase font-bold opacity-60 tracking-widest flex items-center justify-center gap-1">PM Streak</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function Modal({ theme, onClose, children, title }) {
    return (<div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}><div className={`max-w-2xl w-full p-8 rounded-3xl shadow-2xl relative ${theme.glassPanel} border-white/20`} onClick={e => e.stopPropagation()}><button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full"><X size={20}/></button><div className="text-center mb-8"><h2 className="text-3xl font-serif font-bold mb-2">{title}</h2></div>{children}</div></div>)
}

function RoadmapCard({ r, theme, active, onClick, onProfileClick, calculateTotalTime, likeCount, isLiked }) {
    return (
        <div onClick={onClick} className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${theme.glassCard} ${active ? theme.activeState : 'border-transparent'}`}>
            <div className="flex justify-between items-start">
                <div className="font-bold text-sm truncate">{r.title}</div>
                {active && <div className={`w-2 h-2 rounded-full animate-pulse ${theme.accent.replace('text-', 'bg-')}`}></div>}
            </div>
            <div className="flex gap-2 flex-wrap mt-1">{(r.tags || []).slice(0,2).map(tag => (<span key={tag} className="text-[8px] bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded uppercase tracking-wider opacity-60">{tag}</span>))}</div>
            <div className="flex justify-between mt-3 opacity-60 text-[10px] items-center">
                <div className="flex gap-3">
                    <span className="hover:underline hover:text-black dark:hover:text-white cursor-pointer z-10 flex items-center gap-1" onClick={(e) => { e.stopPropagation(); onProfileClick(); }}><User size={10}/> {r.profiles?.username || 'User'}</span>
                    <span className="flex items-center gap-1"><Heart size={10} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "text-red-500" : ""}/> {likeCount || 0}</span>
                </div>
                <span className="flex items-center gap-1"><Clock size={8}/> {calculateTotalTime ? calculateTotalTime(r) : 0}m</span>
            </div>
        </div>
    )
}

function LandingPage({ handleLogin, currentTheme }) {
    const styles = `@keyframes aurora { 0% { background-color: #fbbf24; box-shadow: 0 0 150px #fbbf24; } 33% { background-color: #60a5fa; box-shadow: 0 0 150px #60a5fa; } 66% { background-color: #a855f7; box-shadow: 0 0 150px #a855f7; } 100% { background-color: #fbbf24; box-shadow: 0 0 150px #fbbf24; } }`;
    return (<div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center transition-colors duration-700 ${currentTheme.text}`} style={currentTheme.bg}><style>{styles}</style><div style={{animation: 'aurora 10s infinite linear'}} className="w-96 h-96 rounded-full blur-[100px] absolute opacity-30"></div><h1 className="text-7xl font-serif font-bold italic mb-6 relative z-10 tracking-tighter">FaceForward</h1><p className="text-2xl opacity-60 max-w-xl mb-12 font-light leading-relaxed relative z-10">The glass-clear path to your perfect routine. <br/> Join the social skincare network.</p><button onClick={handleLogin} className={`relative z-10 px-10 py-5 rounded-full font-bold text-lg shadow-2xl hover:scale-105 transition-transform ${currentTheme.button}`}>Start Your Journey</button></div>)
}
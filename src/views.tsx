import React, { useEffect, useState, useRef } from 'react';
import { WorkoutSession, LoggedSet, WorkoutDay, ExerciseDef } from './types';
import { getPreviousPerformance, getFormattedDate } from './utils';
import { ExerciseCard } from './components';
import { ChevronLeft, ChevronRight, CheckCircle2, ChevronDown, ChevronUp, Download, Upload, X, Trash, Unlock, Edit3, Settings2, Plus, Undo2, Calendar, List, CalendarDays } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface WorkoutProps {
  history: WorkoutSession[];
  currentWorkout: WorkoutSession | null;
  onUpdateWorkout: (workout: WorkoutSession) => void;
  onFinishWorkout: () => void;
  viewDate: Date;
  setViewDate: (date: Date) => void;
  schedule: Record<number, WorkoutDay | null>;
  setSchedule: (val: Record<number, WorkoutDay | null> | ((prev: Record<number, WorkoutDay | null>) => Record<number, WorkoutDay | null>)) => void;
  enableWarmup: boolean;
  customPresets: ExerciseDef[];
  saveForUndo?: () => void;
}

export function WorkoutView({ history, currentWorkout, onUpdateWorkout, onFinishWorkout, viewDate, setViewDate, schedule, setSchedule, enableWarmup, customPresets, saveForUndo }: WorkoutProps) {
  const [showSavedMsg, setShowSavedMsg] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isEditingRoutine, setIsEditingRoutine] = useState(false);
  const [editingDay, setEditingDay] = useState<WorkoutDay | null>(null);
  const [hideBanner, setHideBanner] = useState(() => {
    try { return localStorage.getItem('gymlog_hide_banner') === 'true'; } catch(e) { return false; }
  });

  const formattedViewDate = getFormattedDate(viewDate);
  const dayOfWeek = viewDate.getDay();
  const scheduledDay = schedule[dayOfWeek];

  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const isViewingActive = currentWorkout?.date === formattedViewDate;

  useEffect(() => {
    setIsUnlocked(false);
  }, [formattedViewDate]);

  useEffect(() => {
    if (isViewingActive && currentWorkout) {
      const timer = setTimeout(() => {
        setLastSaved(new Date());
      }, 1000); // Indicate save after 1s of no changes
      return () => clearTimeout(timer);
    }
  }, [currentWorkout, isViewingActive]);

  const getActiveOrShell = (): WorkoutSession => {
    if (isViewingActive && currentWorkout) return currentWorkout;
    
    // Check if we already have this workout in history
    const historic = history.find(h => h.date === formattedViewDate);
    if (historic) return historic;

    return {
      id: `tmp_${formattedViewDate}_${Date.now()}`,
      date: formattedViewDate,
      dayName: scheduledDay?.name || 'Rest Day',
      exercises: {},
      isFinished: false,
      exerciseOrder: scheduledDay?.exercises.map(e => e.name) || []
    };
  };

  const sessionData = getActiveOrShell();

  const handleUpdateSet = (exerciseName: string, setIndex: number, newSet: LoggedSet) => {
    saveForUndo?.();
    let updatedSession = { ...sessionData };
    
    // If updating a shell, ensure we carry over the ID properly to make it the active workout
    if (!isViewingActive) {
       updatedSession.id = `workout_${formattedViewDate}`;
    }

    if (!updatedSession.exercises[exerciseName]) {
      updatedSession.exercises[exerciseName] = [];
    }
    const currentSets = [...updatedSession.exercises[exerciseName]];
    currentSets[setIndex] = newSet;
    updatedSession.exercises[exerciseName] = currentSets;

    onUpdateWorkout(updatedSession);
  };

  const handleUpdateAllSets = (exerciseName: string, newSets: LoggedSet[]) => {
    saveForUndo?.();
    let updatedSession = { ...sessionData };
    if (!isViewingActive) {
       updatedSession.id = `workout_${formattedViewDate}`;
    }
    updatedSession.exercises[exerciseName] = newSets;
    onUpdateWorkout(updatedSession);
  };

  const handleFinish = () => {
    onFinishWorkout();
    setShowSavedMsg(true);
    setTimeout(() => setShowSavedMsg(false), 3000);
  };

  const prevDay = () => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() - 1);
    setViewDate(d);
  };

  const nextDay = () => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + 1);
    setViewDate(d);
  };

  const isToday = formattedViewDate === getFormattedDate(new Date());
  const isPast = formattedViewDate < getFormattedDate(new Date());

  const needsUnlock = sessionData.isFinished || (isPast && !sessionData.isFinished);
  const readOnly = needsUnlock && !isUnlocked;

  const dismissBanner = () => {
    try { localStorage.setItem('gymlog_hide_banner', 'true'); } catch(e) {}
    setHideBanner(true);
  };

  const renderWeeklyStrip = () => {
    // Generate dates for the current week starting from Saturday
    const currentDay = viewDate.getDay();
    // Calculate offset to get back to Saturday. If it's Saturday (6), offset is 0. If it's Sunday (0), offset is -1.
    const offset = currentDay === 6 ? 0 : -(currentDay + 1);
    
    const weekDates = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(viewDate);
      d.setDate(d.getDate() + offset + i);
      return d;
    });

    const dayLabels = ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr'];

    return (
      <div className="flex justify-between items-center mb-4 px-1">
        {weekDates.map((d, i) => {
          const isSelected = getFormattedDate(d) === formattedViewDate;
          const isTodayDate = getFormattedDate(d) === getFormattedDate(new Date());
          return (
            <button
              key={i}
              onClick={() => setViewDate(d)}
              className={`flex flex-col items-center justify-center w-10 h-14 rounded-xl transition-colors ${
                isSelected 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                  : isTodayDate 
                    ? 'bg-neutral-800 text-blue-400 border border-blue-900' 
                    : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 border border-neutral-800'
              }`}
            >
              <span className="text-[10px] font-bold uppercase mb-1">{dayLabels[i]}</span>
              <span className={`text-sm font-black ${isSelected ? 'text-white' : 'text-neutral-200'}`}>
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 pb-8">
      {!hideBanner && (
        <div className="bg-[#0B1221] border border-blue-900/30 rounded-xl p-4 mb-4 relative">
          <button onClick={dismissBanner} className="absolute top-3 right-3 text-blue-400 hover:text-blue-300 transition-colors p-1 bg-blue-900/30 rounded-full">
            <X size={16} />
          </button>
          <h4 className="text-blue-400 font-bold mb-1.5 text-[13px] uppercase tracking-wider pr-8">Week 1 Guidance</h4>
          <p className="text-blue-100/80 text-sm leading-relaxed">
            Keep ~3–4 reps in reserve. No failure training. No max lifts. Focus on comfortable technique and establishing your baseline.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex flex-col">
          <div className="text-[10px] text-blue-500 uppercase tracking-widest font-black mb-1">
            {isToday ? "Today's Workout" : viewDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-white font-bold text-2xl tracking-tight">
              {viewDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </div>
            {isViewingActive && lastSaved && (
               <span className="text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full mt-1">
                 Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setViewDate(new Date()) }} className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-sm transition-colors border border-neutral-700">
            Today
          </button>
        </div>
      </div>
      
      {renderWeeklyStrip()}

      {isEditingRoutine ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white tracking-tight">Edit Routine</h2>
            <button onClick={() => { setIsEditingRoutine(false); setEditingDay(null); }} className="text-neutral-400 hover:text-white p-2 bg-neutral-800 rounded-full">
              <X size={20} />
            </button>
          </div>
          
          <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-4">
             <label className="block">
               <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Routine Name</span>
               <input 
                 value={editingDay?.name || ''} 
                 onChange={e => setEditingDay(d => d ? {...d, name: e.target.value} : {name: e.target.value, exercises: []})}
                 className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                 placeholder="e.g. Upper Body A"
               />
             </label>
             
             <div className="space-y-3 mt-4">
               {editingDay?.exercises.map((ex, i) => (
                 <div key={i} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 relative">
                   <div className="flex justify-between items-start mb-3">
                     <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Exercise {i + 1}</span>
                     <div className="flex gap-1">
                       <button onClick={() => {
                          if (i > 0 && editingDay) {
                            const newEx = [...editingDay.exercises];
                            [newEx[i-1], newEx[i]] = [newEx[i], newEx[i-1]];
                            setEditingDay({...editingDay, exercises: newEx});
                          }
                       }} className="p-1 text-neutral-400 hover:text-white bg-neutral-800 rounded-md"><ChevronUp size={16}/></button>
                       <button onClick={() => {
                          if (editingDay && i < editingDay.exercises.length - 1) {
                            const newEx = [...editingDay.exercises];
                            [newEx[i], newEx[i+1]] = [newEx[i+1], newEx[i]];
                            setEditingDay({...editingDay, exercises: newEx});
                          }
                       }} className="p-1 text-neutral-400 hover:text-white bg-neutral-800 rounded-md"><ChevronDown size={16}/></button>
                       <button onClick={() => {
                          if (editingDay) {
                            const newEx = editingDay.exercises.filter((_, idx) => idx !== i);
                            setEditingDay({...editingDay, exercises: newEx});
                          }
                       }} className="p-1 text-red-400 hover:text-red-300 ml-2 bg-red-500/10 rounded-md"><Trash size={16}/></button>
                     </div>
                   </div>
                   
                   <input 
                     value={ex.name} 
                     onChange={e => {
                        const newEx = [...(editingDay?.exercises || [])];
                        newEx[i].name = e.target.value;
                        setEditingDay(d => d ? {...d, exercises: newEx} : null);
                     }}
                     className="w-full mb-2 bg-neutral-900 border border-neutral-800 rounded-md p-2.5 text-white text-sm font-bold outline-none focus:border-neutral-600"
                     placeholder="Exercise Name"
                   />
                   
                   <div className="flex gap-2">
                     <div className="w-16">
                       <label className="text-[10px] text-neutral-500 uppercase block mb-1">Sets</label>
                       <input 
                         value={ex.sets}
                         onChange={e => {
                            const newEx = [...(editingDay?.exercises || [])];
                            newEx[i].sets = parseInt(e.target.value) || 0;
                            setEditingDay(d => d ? {...d, exercises: newEx} : null);
                         }}
                         type="number"
                         className="w-full bg-neutral-900 border border-neutral-800 rounded-md p-2 text-white text-sm outline-none text-center"
                       />
                     </div>
                     <div className="flex-1">
                       <label className="text-[10px] text-neutral-500 uppercase block mb-1">Target</label>
                       <input 
                         value={ex.target}
                         onChange={e => {
                            const newEx = [...(editingDay?.exercises || [])];
                            newEx[i].target = e.target.value;
                            setEditingDay(d => d ? {...d, exercises: newEx} : null);
                         }}
                         className="w-full bg-neutral-900 border border-neutral-800 rounded-md p-2 text-white text-sm outline-none"
                         placeholder="e.g. 10-12 reps"
                       />
                     </div>
                     <div className="w-24">
                       <label className="text-[10px] text-neutral-500 uppercase block mb-1">Type</label>
                       <select 
                         value={ex.type}
                         onChange={e => {
                            const newEx = [...(editingDay?.exercises || [])];
                            newEx[i].type = e.target.value as any;
                            setEditingDay(d => d ? {...d, exercises: newEx} : null);
                         }}
                         className="w-full bg-neutral-900 border border-neutral-800 rounded-md p-2 text-white text-sm outline-none"
                       >
                         <option value="resistance">Weight</option>
                         <option value="duration">Time</option>
                         <option value="cardio">Cardio</option>
                       </select>
                     </div>
                   </div>
                 </div>
               ))}
               
               <div className="flex gap-2">
                 <button onClick={() => {
                    setEditingDay(d => d ? {...d, exercises: [...d.exercises, {name: 'New Exercise', sets: 3, target: '10 reps', type: 'resistance'}]} : {name: 'New Routine', exercises: [{name: 'New Exercise', sets: 3, target: '10 reps', type: 'resistance'}]});
                 }} className="flex-1 py-4 rounded-xl border border-dashed border-neutral-700 text-neutral-400 font-bold hover:text-white hover:border-neutral-500 bg-neutral-950 transition-colors flex items-center justify-center gap-2">
                   <Plus size={18} /> Add Blank
                 </button>
                 
                 <select 
                   onChange={(e) => {
                     const idx = parseInt(e.target.value);
                     if (idx >= 0 && customPresets[idx]) {
                       const preset = customPresets[idx];
                       setEditingDay(d => d ? {...d, exercises: [...d.exercises, {...preset}]} : {name: 'New Routine', exercises: [{...preset}]});
                     }
                     e.target.value = "-1"; // reset
                   }}
                   className="flex-1 py-4 rounded-xl border border-dashed border-neutral-700 text-neutral-400 font-bold hover:text-white hover:border-neutral-500 bg-neutral-950 transition-colors outline-none text-center"
                 >
                   <option value="-1">Add Preset...</option>
                   {customPresets.map((p, i) => (
                     <option key={i} value={i}>{p.name}</option>
                   ))}
                 </select>
               </div>
             </div>
             
             <button onClick={() => {
                if (editingDay) {
                  setSchedule(prev => ({...prev, [dayOfWeek]: editingDay}));
                  setIsEditingRoutine(false);
                }
             }} className="w-full py-4 mt-6 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-colors text-lg">
               Save Routine
             </button>
          </div>
        </div>
      ) : !scheduledDay ? (
         <div className="py-16 text-center border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/30">
           <div className="text-5xl mb-4">🧘</div>
           <h3 className="text-xl font-bold text-white mb-2">Rest Day</h3>
           <p className="text-neutral-500 text-sm mb-4">Gym is closed. Enjoy your recovery.</p>
           <button onClick={() => { setEditingDay({name: 'New Routine', exercises: []}); setIsEditingRoutine(true); }} className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors inline-flex items-center gap-2">
             <Plus size={18} /> Create Routine
           </button>
         </div>
      ) : (
        <>
          <div className="mb-4 flex items-end justify-between px-1">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-black text-white tracking-tight">{scheduledDay.name}</h2>
                <button onClick={() => { setEditingDay(scheduledDay); setIsEditingRoutine(true); }} className="text-neutral-400 hover:text-blue-400 p-1 bg-neutral-800 hover:bg-blue-500/10 rounded-md transition-colors">
                  <Settings2 size={16} />
                </button>
              </div>
              <p className="text-neutral-400 text-sm mt-1.5 font-medium">{scheduledDay.exercises.length} exercises scheduled</p>
            </div>
            {sessionData.isFinished && (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-black uppercase tracking-wider bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 size={16} strokeWidth={3} /> Completed
              </span>
            )}
          </div>

          <div className="space-y-4">
            {scheduledDay.exercises.map((ex, i) => (
              <ExerciseCard
                key={`${ex.name}-${i}`}
                exercise={ex}
                sessionData={sessionData.exercises[ex.name] || []}
                previousData={getPreviousPerformance(ex.name, history)}
                onUpdateSet={(idx, set) => handleUpdateSet(ex.name, idx, set)}
                onUpdateAllSets={(newSets) => handleUpdateAllSets(ex.name, newSets)}
                readOnly={readOnly}
                enableWarmup={enableWarmup}
              />
            ))}
          </div>

          <div className="mt-8">
            {needsUnlock && !isUnlocked ? (
              <button
                onClick={() => setIsUnlocked(true)}
                className="w-full p-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition-all bg-neutral-800 text-white border border-neutral-700 hover:bg-neutral-700 shadow-lg"
              >
                <Unlock size={20} /> {sessionData.isFinished ? "Unlock to Edit" : "Unlock Past Day"}
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={sessionData.isFinished && showSavedMsg}
                className={`w-full p-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition-all shadow-lg ${
                  showSavedMsg
                    ? 'bg-emerald-600 text-white'
                    : sessionData.isFinished
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white'
                }`}
              >
                {showSavedMsg ? (
                  <>Workout saved!</>
                ) : sessionData.isFinished ? (
                  <>Save Changes</>
                ) : (
                  <>Finish Workout</>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function HistoryView({ history, onDelete, onEdit, saveForUndo }: { history: WorkoutSession[], onDelete: (id: string) => void, onEdit: (date: string) => void, saveForUndo?: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmEditId, setConfirmEditId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarMode, setCalendarMode] = useState<'last30' | 'monthly'>('last30');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (history.length === 0) {
    return (
      <div className="p-8 text-center text-neutral-500">
        <p>No workouts completed yet.</p>
      </div>
    );
  }

  // Generate calendar days
  const renderCalendar = () => {
    const today = new Date();
    let days: Date[] = [];
    let startOffset = 0;
    
    if (calendarMode === 'last30') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        days.push(d);
      }
      startOffset = days[0].getDay();
    } else {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const numDays = new Date(year, month + 1, 0).getDate();
      for (let i = 1; i <= numDays; i++) {
        days.push(new Date(year, month, i));
      }
      startOffset = days[0].getDay();
    }
    
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button onClick={() => setCalendarMode('last30')} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${calendarMode === 'last30' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}>30 Days</button>
            <button onClick={() => setCalendarMode('monthly')} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${calendarMode === 'monthly' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}>Monthly</button>
          </div>
          
          {calendarMode === 'monthly' && (
            <div className="flex items-center gap-3">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="text-neutral-400 hover:text-white"><ChevronUp size={16} className="-rotate-90" /></button>
              <span className="text-white font-bold text-sm min-w-[80px] text-center">
                {currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="text-neutral-400 hover:text-white"><ChevronDown size={16} className="-rotate-90" /></button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {['S','M','T','W','T','F','S'].map((day, i) => (
            <div key={`header-${i}`} className="text-center text-[10px] font-bold text-neutral-500">{day}</div>
          ))}
          {/* Pad the start to match day of week of first date */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`pad-${i}`} className="w-full aspect-square"></div>
          ))}
          {days.map((d, i) => {
            const dateStr = getFormattedDate(d);
            const session = history.find(h => h.date === dateStr);
            const isToday = getFormattedDate(d) === getFormattedDate(today);
            return (
              <div 
                key={i} 
                className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold ${
                  session 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                    : isToday 
                      ? 'border border-blue-900 text-blue-400' 
                      : 'bg-neutral-800/50 text-neutral-500'
                }`}
                title={session ? `${session.dayName} on ${dateStr}` : dateStr}
              >
                {d.getDate()}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="flex justify-between items-center mb-4 px-1">
        <h2 className="text-2xl font-black text-white tracking-tight">Workout History</h2>
        <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
            <List size={18} />
          </button>
          <button onClick={() => setViewMode('calendar')} className={`p-2 rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
            <Calendar size={18} />
          </button>
        </div>
      </div>

      {viewMode === 'calendar' && renderCalendar()}

      {sortedHistory.map(session => {
        const numExercises = Object.keys(session.exercises).length;
        const numSets = Object.values(session.exercises).reduce((acc, sets) => acc + sets.filter(s => s?.completed).length, 0);
        const isExpanded = expandedId === session.id;

        return (
          <div key={session.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setExpandedId(isExpanded ? null : session.id)}
              className="w-full p-5 flex items-center justify-between text-left hover:bg-neutral-800/80 transition-colors"
            >
              <div>
                <h3 className="font-bold text-lg text-white mb-1">{session.dayName}</h3>
                <p className="text-sm text-neutral-400 font-medium">{new Date(session.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-[11px] uppercase tracking-wider text-neutral-500 mt-2 font-bold">{numExercises} exercises • {numSets} sets</p>
              </div>
              <div className={`text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                <ChevronDown size={24} />
              </div>
            </button>

            {isExpanded && (
              <div className="p-5 pt-2 border-t border-neutral-800 bg-neutral-950/50">
                {(session.exerciseOrder || Object.keys(session.exercises)).map(exName => {
                  const sets = session.exercises[exName];
                  if (!sets || sets.length === 0) return null;
                  return (
                  <div key={exName} className="mt-4 first:mt-2">
                    <h4 className="font-bold text-[13px] text-blue-400 mb-2 uppercase tracking-wide">{exName}</h4>
                    <div className="space-y-1.5">
                      {sets.map((set, i) => {
                        if (!set) return null;
                        const isDurationOnly = set.duration && !set.weight && !set.reps;
                        return (
                        <div key={i} className="flex items-center text-sm text-neutral-300 bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                          <span className="w-14 font-bold text-neutral-500 text-xs uppercase tracking-wider">Set {i + 1}</span>
                          {!isDurationOnly ? (
                            <span className="flex-1"><strong className="text-white">{set.weight || '0'} kg</strong> × {set.reps || '0'}</span>
                          ) : (
                            <span className="flex-1 font-medium">{set.duration || '0'}</span>
                          )}
                          {set.completed && <CheckCircle2 size={16} className="text-emerald-500" />}
                        </div>
                      )})}
                    </div>
                  </div>
                )})}
                
                <div className="mt-6 pt-4 border-t border-neutral-800/50 flex justify-between items-center">
                  {confirmEditId === session.id ? (
                    <div className="flex items-center gap-2 bg-neutral-900 rounded-lg p-1 border border-blue-500/30">
                      <span className="text-xs font-bold text-neutral-400 px-2">Edit?</span>
                      <button onClick={() => { onEdit(session.date); setConfirmEditId(null); }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-md transition-colors">Yes</button>
                      <button onClick={() => setConfirmEditId(null)} className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-sm rounded-md transition-colors">No</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmEditId(session.id)}
                      className="flex items-center gap-2 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                    >
                      <Edit3 size={16} />
                      Edit Workout
                    </button>
                  )}

                  {confirmDeleteId === session.id ? (
                    <div className="flex items-center gap-2 bg-neutral-900 rounded-lg p-1 border border-red-500/30">
                      <span className="text-xs font-bold text-neutral-400 px-2">Delete?</span>
                      <button onClick={() => onDelete(session.id)} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-md transition-colors">Yes</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-sm rounded-md transition-colors">No</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(session.id)}
                      className="flex items-center gap-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                    >
                      <Trash size={16} />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function ProgressView({ history, schedule }: { history: WorkoutSession[], schedule: Record<number, WorkoutDay | null> }) {
  const [sortBy, setSortBy] = useState<'exercise' | 'day'>('exercise');
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const displayOrder = [6, 0, 1, 2, 3, 4, 5]; // Starts with Saturday (6)

  const stats: Record<string, { maxWeight: number, lastLogs: { date: string, logStr: string, weight: number, volume: number }[] }> = {};

  [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(session => {
    Object.entries(session.exercises).forEach(([exName, sets]) => {
      if (!stats[exName]) {
        stats[exName] = { maxWeight: 0, lastLogs: [] };
      }
      let hasLog = false;
      let logStr = '';
      let sessionMaxWeight = 0;
      let sessionVolume = 0;
      
      sets.forEach(s => {
        if (!s?.completed) return;
        const isDurationOnly = s.duration && !s.weight && !s.reps;
        if (!isDurationOnly && s.weight) {
          const w = parseFloat(s.weight) || 0;
          const r = parseFloat(s.reps) || 0;
          if (w > stats[exName].maxWeight) {
            stats[exName].maxWeight = w;
          }
          if (w > sessionMaxWeight) {
            sessionMaxWeight = w;
          }
          sessionVolume += (w * r);
          hasLog = true;
          logStr = `${s.weight} kg × ${s.reps}`;
        } else if (isDurationOnly) {
          hasLog = true;
          logStr = s.duration;
        }
      });
      
      if (hasLog) {
        const dateStr = session.date.substring(5).replace('-', '/'); // '09-12' -> '09/12'
        const existing = stats[exName].lastLogs.find(l => l.date === dateStr && l.logStr === logStr);
        if (!existing) {
          stats[exName].lastLogs.push({ date: dateStr, logStr, weight: sessionMaxWeight, volume: sessionVolume });
        }
      }
    });
  });

  const allRoutineExercises = new Set<string>();
  Object.values(schedule).forEach(day => {
    day?.exercises.forEach(ex => allRoutineExercises.add(ex.name));
  });

  let exerciseNames = Object.keys(stats).sort();

  let currentExercises = exerciseNames.filter(ex => allRoutineExercises.has(ex));
  let pastExercises = exerciseNames.filter(ex => !allRoutineExercises.has(ex));

  if (sortBy === 'day') {
    const routine = schedule[selectedDay];
    if (routine) {
      const routineSet = new Set(routine.exercises.map(e => e.name));
      currentExercises = exerciseNames.filter(ex => routineSet.has(ex));
      
      const historicalExOnThisDay = new Set<string>();
      history.forEach(session => {
        if (new Date(session.date).getDay() === selectedDay) {
           Object.keys(session.exercises).forEach(ex => historicalExOnThisDay.add(ex));
        }
      });
      pastExercises = exerciseNames.filter(ex => !routineSet.has(ex) && historicalExOnThisDay.has(ex));
    } else {
      currentExercises = [];
      const historicalExOnThisDay = new Set<string>();
      history.forEach(session => {
        if (new Date(session.date).getDay() === selectedDay) {
           Object.keys(session.exercises).forEach(ex => historicalExOnThisDay.add(ex));
        }
      });
      pastExercises = exerciseNames.filter(ex => historicalExOnThisDay.has(ex));
    }
  }

  const handleExportProgress = (format: 'txt' | 'csv') => {
    let content = '';
    let mimeType = 'text/plain';
    
    if (format === 'csv') {
      mimeType = 'text/csv';
      content = 'Exercise,MaxWeight,LatestLog\n';
      exerciseNames.forEach(ex => {
        const data = stats[ex];
        const latest = data.lastLogs.length > 0 ? data.lastLogs[data.lastLogs.length-1].logStr : '';
        content += `"${ex}",${data.maxWeight},"${latest}"\n`;
      });
    } else {
      content = '=== GymLog Progress ===\n\n';
      exerciseNames.forEach(ex => {
        const data = stats[ex];
        content += `${ex}\n`;
        content += `  Max Weight: ${data.maxWeight} kg\n`;
        if (data.lastLogs.length > 0) {
          content += `  Latest Session: ${data.lastLogs[data.lastLogs.length-1].date} - ${data.lastLogs[data.lastLogs.length-1].logStr}\n`;
        }
        content += '\n';
      });
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gymlog_progress_${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    
    // Use an alert since we don't have a toast component in this view (or we can just let it download silently)
  };

  if (Object.keys(stats).length === 0) {
    return (
       <div className="p-8 text-center text-neutral-500">
        <p>No progress data yet. Complete some workouts first.</p>
      </div>
    )
  }

  const renderExerciseList = (list: string[], showChart: boolean = false) => (
    <div className="space-y-4">
      {list.map(ex => {
        const data = stats[ex];
        const recent = data.lastLogs.slice(-3).reverse();
        // Chart data
        const chartData = data.lastLogs.map(log => ({ name: log.date, weight: log.weight, volume: log.volume }));
        
        return (
          <div key={ex} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm">
            <h3 className="font-bold text-white mb-3 text-lg">{ex}</h3>
            {data.maxWeight > 0 && (
              <div className="inline-flex items-center px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-wider rounded-lg mb-4">
                Max Weight: {data.maxWeight} kg
              </div>
            )}
            
            {showChart && chartData.length > 1 && data.maxWeight > 0 && (
              <div className="h-40 w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="name" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} width={30} />
                    <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '8px', fontSize: '12px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="weight" name="Max Weight (kg)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden">
              <div className="bg-neutral-900/50 px-3 py-2 border-b border-neutral-800 font-bold uppercase tracking-widest text-[10px] text-neutral-500">
                Recent Sessions
              </div>
              <div className="divide-y divide-neutral-800/50">
                {recent.map((log, i) => (
                  <div key={i} className="flex items-center justify-between p-3 text-sm hover:bg-neutral-900/30 transition-colors">
                    <span className="text-neutral-400 font-medium">{log.date}</span>
                    <span className="text-white font-bold">{log.logStr}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-black text-white px-1 tracking-tight">Progress Tracker</h2>
      </div>
      
      <div className="flex gap-2 bg-neutral-900 border border-neutral-800 p-1 rounded-xl mb-4">
        <button 
          onClick={() => setSortBy('exercise')} 
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${sortBy === 'exercise' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'}`}
        >
          All Exercises
        </button>
        <button 
          onClick={() => setSortBy('day')} 
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${sortBy === 'day' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'}`}
        >
          By Day
        </button>
      </div>

      {sortBy === 'day' && (
        <select 
          value={selectedDay} 
          onChange={(e) => setSelectedDay(Number(e.target.value))}
          className="w-full bg-neutral-900 text-white p-3 rounded-xl border border-neutral-800 outline-none text-sm mb-4 font-bold focus:ring-2 focus:ring-blue-500"
        >
          {displayOrder.map(idx => (
             <option key={idx} value={idx}>{days[idx]} {schedule[idx] ? `- ${schedule[idx]?.name}` : '(Rest)'}</option>
          ))}
        </select>
      )}
      
      {exerciseNames.length === 0 && sortBy === 'day' && (
        <div className="p-8 text-center text-neutral-500">
          <p>No logged progress for exercises in this routine.</p>
        </div>
      )}

      {currentExercises.length > 0 && (
        <div className="space-y-3">
           <h3 className="text-neutral-400 font-bold uppercase tracking-widest text-xs px-1 mt-6">Current Routine</h3>
           {renderExerciseList(currentExercises, false)}
        </div>
      )}
      {pastExercises.length > 0 && (
        <div className="space-y-3">
           <h3 className="text-neutral-500 font-bold uppercase tracking-widest text-xs px-1 mt-6">Past Exercises</h3>
           {renderExerciseList(pastExercises, false)}
        </div>
      )}
    </div>
  );
}

export function SettingsView({
  history,
  currentWorkout,
  onImport,
  restTimerDefault,
  onUpdateRestTimer,
  fontSize,
  setFontSize,
  enableWarmup,
  setEnableWarmup,
  soundEnabled,
  setSoundEnabled,
  vibrateEnabled,
  setVibrateEnabled,
  timerEnabled,
  setTimerEnabled,
  customPresets,
  setCustomPresets,
  cloudSync
}: {
  history: WorkoutSession[],
  currentWorkout: WorkoutSession | null,
  onImport: (data: any) => void,
  restTimerDefault: number,
  onUpdateRestTimer: (val: number) => void,
  fontSize: string,
  setFontSize: (val: string) => void,
  enableWarmup: boolean,
  setEnableWarmup: (val: boolean) => void,
  soundEnabled: boolean,
  setSoundEnabled: (val: boolean) => void,
  vibrateEnabled: boolean,
  setVibrateEnabled: (val: boolean) => void,
  timerEnabled: boolean,
  setTimerEnabled: (val: boolean) => void,
  customPresets: ExerciseDef[],
  setCustomPresets: (val: ExerciseDef[]) => void,
  cloudSync: {
    user: import('firebase/auth').User | null,
    login: () => Promise<void>,
    logout: () => Promise<void>,
    isSyncing: boolean,
    lastSynced: Date | null
  }
}) {
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  
  const [showAddPreset, setShowAddPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetSets, setNewPresetSets] = useState(3);
  const [newPresetTarget, setNewPresetTarget] = useState('10 reps');
  const [newPresetType, setNewPresetType] = useState<'resistance'|'duration'|'cardio'>('resistance');

  const handleExport = (format: 'json' | 'txt' | 'csv' | 'progress-txt' | 'progress-csv') => {
    let content = '';
    let mimeType = 'text/plain';
    let ext = 'txt';

    if (format === 'json') {
      mimeType = 'application/json';
      ext = 'json';
      content = JSON.stringify({ history, currentWorkout }, null, 2);
    } else if (format === 'txt') {
      mimeType = 'text/plain';
      ext = 'txt';
      content = '=== GymLog History ===\n\n';
      [...history].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(session => {
        content += `[ ${session.date} - ${session.dayName} ]\n`;
        Object.entries(session.exercises).forEach(([exName, sets]) => {
          content += `\n${exName}\n`;
          sets.forEach((set, i) => {
            if (set.completed) {
              let log = `  Set ${i + 1}: `;
              const parts = [];
              if (set.weight || set.reps) parts.push(`${set.weight || '0'} kg x ${set.reps || '0'} reps`);
              if (set.duration) parts.push(`Time: ${set.duration}`);
              if (set.distance) parts.push(`Dist: ${set.distance}`);
              if (set.pace) parts.push(`Pace: ${set.pace}`);
              if (set.incline) parts.push(`Incline: ${set.incline}`);
              
              if (set.isWarmup) log += "[Warmup] ";
              log += parts.join(' | ');
              content += log + '\n';
            }
          });
        });
        content += '\n----------------------------------------\n\n';
      });
    } else if (format === 'csv') {
      mimeType = 'text/csv';
      ext = 'csv';
      content = '"Date","Day","Exercise","Set","Weight","Reps","Duration","Distance","Pace","Incline","Is Warmup"\n';
      [...history].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(session => {
        // use Excel friendly date formula to prevent auto-formatting to #####
        const fmtDate = `="${session.date}"`;
        Object.entries(session.exercises).forEach(([exName, sets]) => {
          const safeEx = exName.replace(/"/g, '""');
          sets.forEach((set, i) => {
            if (set.completed) {
              content += `${fmtDate},"${session.dayName}","${safeEx}",${i+1},"${set.weight || ''}","${set.reps || ''}","${set.duration || ''}","${set.distance || ''}","${set.pace || ''}","${set.incline || ''}",${set.isWarmup ? 'TRUE' : 'FALSE'}\n`;
            }
          });
        });
      });
    } else if (format === 'progress-csv' || format === 'progress-txt') {
      // Calculate basic stats for export
      const stats: Record<string, { maxWeight: number, latestLog: string, latestDate: string }> = {};
      [...history].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(session => {
        Object.entries(session.exercises).forEach(([exName, sets]) => {
          if (!stats[exName]) stats[exName] = { maxWeight: 0, latestLog: '', latestDate: '' };
          let maxW = 0;
          let logStr = '';
          let hasLog = false;
          sets.forEach(s => {
            if (!s.completed) return;
            const w = parseFloat(s.weight) || 0;
            if (w > maxW) maxW = w;
            if (w > stats[exName].maxWeight) stats[exName].maxWeight = w;
            hasLog = true;
            if (s.weight || s.reps) logStr = `${s.weight||0} kg x ${s.reps||0}`;
            else if (s.duration) logStr = s.duration;
          });
          if (hasLog && !stats[exName].latestDate) {
             stats[exName].latestDate = session.date;
             stats[exName].latestLog = logStr;
          }
        });
      });
      
      const sortedExercises = Object.keys(stats).sort();
      
      if (format === 'progress-csv') {
        mimeType = 'text/csv';
        ext = 'csv';
        content = '"Exercise","Max Weight (kg)","Latest Date","Latest Log"\n';
        sortedExercises.forEach(ex => {
          const safeEx = ex.replace(/"/g, '""');
          const d = stats[ex];
          content += `"${safeEx}",${d.maxWeight},="${d.latestDate}","${d.latestLog.replace(/"/g, '""')}"\n`;
        });
      } else {
        mimeType = 'text/plain';
        ext = 'txt';
        content = '=== GymLog Progress ===\n\n';
        sortedExercises.forEach(ex => {
          const d = stats[ex];
          content += `${ex}\n  Max Weight: ${d.maxWeight} kg\n`;
          if (d.latestDate) content += `  Latest: ${d.latestDate} - ${d.latestLog}\n`;
          content += '\n';
        });
      }
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const prefix = format.includes('progress') ? 'progress' : (format === 'json' ? 'data' : 'history');
    a.download = `gymlog_${prefix}_${new Date().toISOString().split('T')[0]}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg(`Exported successfully.`);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        onImport(data);
        setMsg('Data imported successfully!');
        setTimeout(() => setMsg(''), 3000);
      } catch (err) {
        setMsg('Failed to parse file.');
        setTimeout(() => setMsg(''), 3000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 space-y-6 pb-8">
      <h2 className="text-2xl font-black text-white mb-4 px-1 tracking-tight">Settings & Data</h2>

      {msg && (
        <div className="bg-blue-500/10 text-blue-400 p-4 rounded-xl border border-blue-500/20 text-sm font-bold shadow-sm">
          {msg}
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-white mb-4 text-lg">Preferences</h3>
        
        <div className="mb-4 flex items-center justify-between">
          <div>
            <label className="block text-sm font-bold text-neutral-400 uppercase tracking-wide">Warm-up Sets</label>
            <p className="text-xs text-neutral-500 mt-1">Allow adding warm-up sets to exercises</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={enableWarmup} onChange={e => setEnableWarmup(e.target.checked)} />
            <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <label className="block text-sm font-bold text-neutral-400 uppercase tracking-wide">On-Screen Timer</label>
            <p className="text-xs text-neutral-500 mt-1">Enable or disable the floating rest timer</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={timerEnabled} onChange={e => setTimerEnabled(e.target.checked)} />
            <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <label className="block text-sm font-bold text-neutral-400 uppercase tracking-wide">Timer Sound</label>
            <p className="text-xs text-neutral-500 mt-1">Play chime when rest is complete</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={soundEnabled} onChange={e => setSoundEnabled(e.target.checked)} />
            <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <label className="block text-sm font-bold text-neutral-400 uppercase tracking-wide">Timer Vibration</label>
            <p className="text-xs text-neutral-500 mt-1">Vibrate when rest is complete</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={vibrateEnabled} onChange={e => setVibrateEnabled(e.target.checked)} />
            <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold text-neutral-400 mb-2 uppercase tracking-wide">Global Font Size</label>
          <select
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
            className="w-full bg-neutral-950 text-white p-4 rounded-xl border border-neutral-800 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
          >
            <option value="14px">Small</option>
            <option value="16px">Medium (Default)</option>
            <option value="18px">Large</option>
            <option value="20px">Extra Large</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-bold text-neutral-400 mb-2 uppercase tracking-wide">Custom Presets</label>
          <p className="text-xs text-neutral-500 mb-3">Add presets that you can quickly insert into your routines.</p>
          <div className="space-y-2 mb-3">
            {customPresets.map((preset, i) => (
              <div key={i} className="flex justify-between items-center bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg text-sm">
                <span className="font-bold text-neutral-300">{preset.name}</span>
                <div className="flex gap-2 items-center">
                  <span className="text-neutral-500">{preset.sets} × {preset.target}</span>
                  <button onClick={() => setCustomPresets(customPresets.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-400 p-1">
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {showAddPreset ? (
            <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl mb-3 space-y-3">
              <input
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                placeholder="Preset Name (e.g. Deadlift)"
                className="w-full bg-neutral-900 text-white p-2.5 rounded-lg border border-neutral-800 focus:border-blue-500 outline-none text-sm"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex items-center gap-2 flex-1">
                 <input
                   type="number"
                   value={newPresetSets}
                   onChange={e => setNewPresetSets(parseInt(e.target.value) || 0)}
                   className="w-16 flex-shrink-0 bg-neutral-900 text-white p-2.5 rounded-lg border border-neutral-800 outline-none text-sm text-center"
                   placeholder="Sets"
                 />
                 <span className="text-neutral-500 font-medium">×</span>
                 <input
                   value={newPresetTarget}
                   onChange={e => setNewPresetTarget(e.target.value)}
                   className="flex-1 min-w-0 bg-neutral-900 text-white p-2.5 rounded-lg border border-neutral-800 outline-none text-sm"
                   placeholder="Target"
                 />
                </div>
                 <select
                   value={newPresetType}
                   onChange={e => setNewPresetType(e.target.value as any)}
                   className="flex-1 sm:max-w-[140px] bg-neutral-900 text-white p-2.5 rounded-lg border border-neutral-800 outline-none text-sm"
                 >
                   <option value="resistance">Weight</option>
                   <option value="duration">Time</option>
                   <option value="cardio">Cardio</option>
                 </select>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => {
                   if (newPresetName.trim()) {
                     setCustomPresets([...customPresets, { name: newPresetName.trim(), sets: newPresetSets, target: newPresetTarget, type: newPresetType }]);
                     setNewPresetName('');
                     setShowAddPreset(false);
                   }
                 }} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-lg transition-colors">
                   Save Preset
                 </button>
                 <button onClick={() => setShowAddPreset(false)} className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm rounded-lg transition-colors">
                   Cancel
                 </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddPreset(true)} className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm rounded-xl transition-colors border border-neutral-700 flex items-center justify-center gap-2">
              <Plus size={16} /> Add Preset
            </button>
          )}
        </div>

        <div className="mt-5">
          <label className="block text-sm font-bold text-neutral-400 mb-2 uppercase tracking-wide">Default Rest Timer</label>
          <select
            value={restTimerDefault}
            onChange={(e) => onUpdateRestTimer(Number(e.target.value))}
            className="w-full bg-neutral-950 text-white p-4 rounded-xl border border-neutral-800 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
          >
            <option value={30}>30 seconds</option>
            <option value={60}>60 seconds (1 minute)</option>
            <option value={90}>90 seconds (1.5 minutes)</option>
            <option value={120}>120 seconds (2 minutes)</option>
            <option value={150}>150 seconds (2.5 minutes)</option>
            <option value={180}>180 seconds (3 minutes)</option>
            <option value={300}>300 seconds (5 minutes)</option>
          </select>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-white mb-2 text-lg">Cloud Sync</h3>
        <p className="text-sm text-neutral-400 mb-4 leading-relaxed">
          {cloudSync.user ? `Signed in as ${cloudSync.user.email}` : 'Sign in to back up your data to the cloud and sync across devices.'}
        </p>

        {cloudSync.user ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${cloudSync.isSyncing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></span>
              <span className="text-neutral-300">
                {cloudSync.isSyncing ? 'Syncing data...' : cloudSync.lastSynced ? `Last synced at ${cloudSync.lastSynced.toLocaleTimeString()}` : 'Cloud sync is active'}
              </span>
            </div>
            <button
              onClick={cloudSync.logout}
              className="w-full flex items-center justify-center gap-3 p-4 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-500 font-bold rounded-xl transition-colors border border-red-500/20"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={cloudSync.login}
            className="w-full flex items-center justify-center gap-3 p-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-400 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20"
          >
            Sign In with Google
          </button>
        )}
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-white mb-2 text-lg">App Installation</h3>
        <p className="text-sm text-neutral-400 mb-4 leading-relaxed">
          Install GymLog on your device for quick access and offline capabilities.
        </p>
        <PWAInstallButton />
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-white mb-2 text-lg">Data Management</h3>
        <p className="text-sm text-neutral-400 mb-4 leading-relaxed">
          Your data is stored locally in your browser. Export it to back it up or move to another device.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => handleExport('json')}
            className="w-full flex items-center justify-center gap-3 p-4 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white font-bold rounded-xl transition-colors border border-neutral-700"
          >
            <Download size={20} className="text-blue-400" />
            Export Data to JSON
          </button>
          
          <button
            onClick={() => handleExport('txt')}
            className="w-full flex items-center justify-center gap-3 p-4 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white font-bold rounded-xl transition-colors border border-neutral-700"
          >
            <Download size={20} className="text-blue-400" />
            Export History to TXT
          </button>
          
          <button
            onClick={() => handleExport('csv')}
            className="w-full flex items-center justify-center gap-3 p-4 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white font-bold rounded-xl transition-colors border border-neutral-700"
          >
            <Download size={20} className="text-blue-400" />
            Export History to CSV
          </button>
          
          <button
            onClick={() => handleExport('progress-txt')}
            className="w-full flex items-center justify-center gap-3 p-4 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white font-bold rounded-xl transition-colors border border-neutral-700"
          >
            <Download size={20} className="text-green-400" />
            Export Progress to TXT
          </button>

          <button
            onClick={() => handleExport('progress-csv')}
            className="w-full flex items-center justify-center gap-3 p-4 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white font-bold rounded-xl transition-colors border border-neutral-700"
          >
            <Download size={20} className="text-green-400" />
            Export Progress to CSV
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-3 p-4 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white font-bold rounded-xl transition-colors border border-neutral-700"
          >
            <Upload size={20} className="text-blue-400" />
            Import Data from JSON
          </button>
          <input type="file" accept=".json" ref={fileRef} className="hidden" onChange={handleImport} />
        </div>
      </div>
      
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-white mb-2 text-lg">About</h3>
        <p className="text-sm text-neutral-400 leading-relaxed">
          Developed by <strong>Ahnaf Rahman</strong>
        </p>
      </div>
    </div>
  );
}

import jsPDF from 'jspdf';

export function RoutinesView({ schedule, setSchedule, history }: { schedule: Record<number, WorkoutDay | null>, setSchedule: any, history: WorkoutSession[] }) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const displayOrder = [6, 0, 1, 2, 3, 4, 5]; // Starts with Saturday (6)

  const [importDay, setImportDay] = useState<number>(6);
  const [importName, setImportName] = useState('');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importMode, setImportMode] = useState<'single' | 'week'>('single');
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [confirmClearDay, setConfirmClearDay] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentWeek, setCurrentWeek] = useState<Date>(() => {
    const d = new Date();
    const offset = (d.getDay() + 1) % 7;
    d.setDate(d.getDate() - offset); // Start on Saturday
    return d;
  });

  const handleExportPDF = () => {
    const doc = new jsPDF();
    let yPos = 20;
    doc.setFontSize(20);
    doc.text('Weekly Routine', 20, yPos);
    yPos += 10;
    
    displayOrder.forEach(idx => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      const routine = schedule[idx];
      doc.text(`${days[idx]} ${routine ? `- ${routine.name}` : '- Rest'}`, 20, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      if (routine) {
        routine.exercises.forEach(ex => {
          doc.text(`• ${ex.name} (${ex.sets} x ${ex.target})`, 25, yPos);
          yPos += 6;
        });
      }
      yPos += 5;
    });
    
    doc.save('GymLog_Routine.pdf');
  };

  const handleExportWeekHistoryPDF = () => {
    const doc = new jsPDF();
    let yPos = 20;
    doc.setFontSize(20);
    const weekStartStr = currentWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekEnd = new Date(currentWeek);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    doc.text(`Weekly Routine (${weekStartStr} - ${weekEndStr})`, 20, yPos);
    yPos += 10;
    
    displayOrder.forEach((idx, offsetIndex) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      const d = new Date(currentWeek);
      d.setDate(d.getDate() + offsetIndex);
      
      const routine = schedule[idx];
      
      if (routine) {
        doc.text(`${days[idx]} - ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${routine.name}`, 20, yPos);
        yPos += 7;
        
        doc.setFontSize(10);
        routine.exercises.forEach(ex => {
          doc.text(`• ${ex.name} (${ex.sets} x ${ex.target})`, 25, yPos);
          yPos += 6;
        });
      } else {
        doc.text(`${days[idx]} - ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, 20, yPos);
        yPos += 7;
        
        doc.setFontSize(10);
        doc.text(`Rest Day`, 25, yPos);
        yPos += 6;
      }
      yPos += 5;
    });
    
    doc.save(`GymLog_Routine_${getFormattedDate(currentWeek)}.pdf`);
  };

  const parseLineToExercise = (line: string) => {
    const [namePart, repPart] = line.split('-').map(s => s.trim());
    const name = namePart || 'Unknown Exercise';
    let sets = 3;
    let target = '10 reps';
    let type: 'resistance' | 'duration' | 'cardio' = 'resistance';
    
    if (repPart) {
      const parts = repPart.toLowerCase().split('x').map(s => s.trim());
      if (parts.length === 2) {
        sets = parseInt(parts[0]) || 3;
        target = parts[1];
        if (target.includes('s') || target.includes('min') || target.includes('m')) {
           type = 'duration';
        } else {
           target = target + ' reps';
        }
      } else {
        target = repPart;
      }
    }
    return { name, sets, target, type };
  };

  const handleImportTxt = () => {
    if (importMode === 'single') {
      const lines = importText.split('\n').filter(l => l.trim());
      const exercises = lines.map(parseLineToExercise);
      setSchedule((prev: any) => ({
        ...prev,
        [importDay]: { name: importName || 'Imported Routine', exercises }
      }));
    } else {
      // Whole week import
      const lines = importText.split('\n').filter(l => l.trim());
      let currentDayIdx = -1;
      const newSchedule = { ...schedule };
      let currentRoutineName = '';

      lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        // Check if line matches a day name
        const matchDayIdx = days.findIndex(d => lowerLine.startsWith(d.toLowerCase()));
        if (matchDayIdx !== -1) {
           currentDayIdx = matchDayIdx;
           const parts = line.split('-');
           currentRoutineName = parts.length > 1 ? parts.slice(1).join('-').trim() : 'Routine';
           newSchedule[currentDayIdx] = { name: currentRoutineName, exercises: [] };
        } else if (currentDayIdx !== -1) {
           // Parse as exercise
           const ex = parseLineToExercise(line);
           if (newSchedule[currentDayIdx]) {
              newSchedule[currentDayIdx]!.exercises.push(ex);
           }
        }
      });
      setSchedule(newSchedule);
    }
    
    setShowImport(false);
    setImportText('');
    setImportName('');
  };
  
  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-black text-white px-1 tracking-tight">Weekly Routines</h2>
        <div className="flex gap-2">
          <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
              <List size={16} />
            </button>
            <button onClick={() => setViewMode('calendar')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
              <Calendar size={16} />
            </button>
          </div>
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-lg transition-colors">
            <Download size={14} /> PDF
          </button>
          <button onClick={() => setShowImport(!showImport)} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-lg transition-colors">
            <Upload size={14} /> Import
          </button>
        </div>
      </div>

      {showImport && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm mb-4">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-white text-sm">Import from Text</h3>
             <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg p-1">
               <button onClick={() => setImportMode('single')} className={`px-2 py-1 text-xs font-bold rounded-md ${importMode === 'single' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'}`}>Single Day</button>
               <button onClick={() => setImportMode('week')} className={`px-2 py-1 text-xs font-bold rounded-md ${importMode === 'week' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'}`}>Whole Week</button>
             </div>
          </div>
          
          <p className="text-xs text-neutral-400 mb-4">
            {importMode === 'single' 
              ? 'Format: Exercise Name - Sets x Reps/Time (e.g. Squat - 3 x 10)' 
              : 'Format: Day Name - Routine Name\\nExercise - Sets x Reps\\n(e.g. Monday - Leg Day\\nSquat - 3 x 10)'}
          </p>
          
          {importMode === 'single' && (
            <input 
              value={importName} onChange={e => setImportName(e.target.value)} 
              placeholder="Routine Name (e.g. Leg Day)" 
              className="w-full mb-3 bg-neutral-950 text-white p-3 rounded-xl border border-neutral-800 focus:border-blue-500 outline-none text-sm"
            />
          )}
          <textarea 
            value={importText} onChange={e => setImportText(e.target.value)}
            placeholder={importMode === 'single' ? "Squat - 3 x 10\nPlank - 3 x 60s" : "Saturday - Pull Day\nPullup - 3 x 10\nSunday - Push Day\nBench - 3 x 10"}
            className="w-full h-32 mb-3 bg-neutral-950 text-white p-3 rounded-xl border border-neutral-800 focus:border-blue-500 outline-none text-sm font-mono"
          />
          <div className="flex items-center gap-3">
            {importMode === 'single' && (
              <select value={importDay} onChange={e => setImportDay(Number(e.target.value))} className="bg-neutral-950 text-white p-2.5 rounded-xl border border-neutral-800 flex-1 outline-none text-sm">
                {displayOrder.map(idx => <option key={idx} value={idx}>{days[idx]}</option>)}
              </select>
            )}
            <button onClick={handleImportTxt} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-colors flex-1">
              {importMode === 'single' ? 'Save to Day' : 'Import Week'}
            </button>
          </div>
        </div>
      )}
      
      {viewMode === 'calendar' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm">
            <h3 className="font-bold text-white text-sm">Weekly Routine Schedule</h3>
            <div className="flex items-center gap-3">
              <button onClick={handleExportWeekHistoryPDF} className="p-1.5 text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors" title="Download Week as PDF">
                <Download size={16} />
              </button>
              <button onClick={() => {
                const prev = new Date(currentWeek);
                prev.setDate(prev.getDate() - 7);
                setCurrentWeek(prev);
              }} className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 rounded-lg"><ChevronUp size={16} className="-rotate-90" /></button>
              <span className="text-white font-bold text-xs min-w-[120px] text-center">
                {currentWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                {(() => { const e = new Date(currentWeek); e.setDate(e.getDate() + 6); return e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); })()}
              </span>
              <button onClick={() => {
                const next = new Date(currentWeek);
                next.setDate(next.getDate() + 7);
                setCurrentWeek(next);
              }} className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 rounded-lg"><ChevronDown size={16} className="-rotate-90" /></button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {displayOrder.map((idx, offsetIndex) => {
               const d = new Date(currentWeek);
               d.setDate(d.getDate() + offsetIndex);
               const dateStr = getFormattedDate(d);
               const routine = schedule[idx];
               const isToday = dateStr === getFormattedDate(new Date());

               return (
                 <div key={idx} className={`bg-neutral-900 border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 ${isToday ? 'border-blue-500/50' : 'border-neutral-800'}`}>
                    <div className="min-w-[100px]">
                       <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{days[idx]}</div>
                       <div className="text-sm font-bold text-neutral-300">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                    <div className="flex-1">
                       {routine ? (
                         <div>
                            <div className="font-bold text-white text-sm mb-2">{routine.name}</div>
                            <div className="flex flex-col gap-1.5">
                              {routine.exercises.map((ex, i) => (
                                 <div key={i} className="flex justify-between items-center text-[11px] bg-neutral-950 border border-neutral-800 px-3 py-2 rounded-lg">
                                   <span className="font-bold text-neutral-300 truncate pr-2">{ex.name}</span>
                                   <span className="text-neutral-500 whitespace-nowrap">{ex.sets} x {ex.target}</span>
                                 </div>
                              ))}
                            </div>
                         </div>
                       ) : (
                         <div className="text-sm text-neutral-600 italic">Rest Day</div>
                       )}
                    </div>
                 </div>
               );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {displayOrder.map((idx) => {
            const dayName = days[idx];
            const dayRoutine = schedule[idx];
            const isEditing = editingDay === idx;

            return (
              <div key={idx} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg text-white">{dayName} {dayRoutine ? `- ${dayRoutine.name}` : '- Rest Day'}</h3>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button onClick={() => setEditingDay(null)} className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 rounded-lg">
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditingDay(idx)} className="p-1.5 text-blue-500 hover:text-blue-400 bg-blue-500/10 rounded-lg">
                    <Edit3 size={16} />
                  </button>
                )}
              </div>
            </div>
            
            {isEditing ? (
              <div className="space-y-3 mt-3 border-t border-neutral-800 pt-3">
                <input 
                  value={dayRoutine?.name || ''} 
                  onChange={e => {
                    const newName = e.target.value;
                    setSchedule((prev: any) => ({
                       ...prev, 
                       [idx]: prev[idx] ? { ...prev[idx], name: newName } : { name: newName, exercises: [] }
                    }));
                  }}
                  placeholder="Routine Name" 
                  className="w-full bg-neutral-950 text-white p-2.5 rounded-lg border border-neutral-800 outline-none text-sm"
                />
                
                {dayRoutine?.exercises.map((ex, i) => (
                  <div key={i} className="flex flex-col gap-3 bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                    <div className="flex justify-between items-center gap-2">
                      <input 
                        value={ex.name}
                        onChange={e => {
                          const newExercises = [...dayRoutine.exercises];
                          newExercises[i].name = e.target.value;
                          setSchedule((prev: any) => ({ ...prev, [idx]: { ...prev[idx], exercises: newExercises } }));
                        }}
                        placeholder="Exercise Name"
                        className="flex-1 bg-neutral-900 p-2 rounded-lg text-white outline-none text-sm"
                      />
                      <button onClick={() => {
                          const newExercises = [...dayRoutine.exercises];
                          newExercises.splice(i, 1);
                          setSchedule((prev: any) => ({ ...prev, [idx]: { ...prev[idx], exercises: newExercises } }));
                      }} className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg">
                        <Trash size={16} />
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <input 
                          type="number"
                          value={ex.sets}
                          onChange={e => {
                            const newExercises = [...dayRoutine.exercises];
                            newExercises[i].sets = parseInt(e.target.value) || 0;
                            setSchedule((prev: any) => ({ ...prev, [idx]: { ...prev[idx], exercises: newExercises } }));
                          }}
                          className="w-16 flex-shrink-0 bg-neutral-900 text-center text-white p-2 rounded-lg outline-none text-sm"
                          placeholder="Sets"
                        />
                        <span className="text-neutral-500 font-medium">×</span>
                        <input 
                          value={ex.target}
                          onChange={e => {
                            const newExercises = [...dayRoutine.exercises];
                            newExercises[i].target = e.target.value;
                            setSchedule((prev: any) => ({ ...prev, [idx]: { ...prev[idx], exercises: newExercises } }));
                          }}
                          className="flex-1 min-w-0 bg-neutral-900 text-center text-white p-2 rounded-lg outline-none text-sm"
                          placeholder="Target"
                        />
                      </div>
                      <select
                        value={ex.type}
                        onChange={e => {
                          const newExercises = [...dayRoutine.exercises];
                          newExercises[i].type = e.target.value as any;
                          setSchedule((prev: any) => ({ ...prev, [idx]: { ...prev[idx], exercises: newExercises } }));
                        }}
                        className="flex-1 sm:max-w-[140px] bg-neutral-900 text-white p-2 rounded-lg outline-none text-sm"
                      >
                        <option value="resistance">Weight</option>
                        <option value="duration">Time</option>
                        <option value="cardio">Cardio</option>
                      </select>
                    </div>
                  </div>
                ))}
                
                <div className="flex gap-2 pt-2">
                  <button onClick={() => {
                    const newExercises = dayRoutine ? [...dayRoutine.exercises] : [];
                    newExercises.push({ name: 'New Exercise', sets: 3, target: '10 reps', type: 'resistance' });
                    setSchedule((prev: any) => ({ ...prev, [idx]: { name: dayRoutine?.name || 'Routine', exercises: newExercises } }));
                  }} className="flex-1 py-2 bg-neutral-800 text-neutral-300 hover:text-white text-sm font-bold rounded-lg border border-neutral-700">
                    + Add Exercise
                  </button>
                  {confirmClearDay === idx ? (
                    <div className="flex items-center gap-2">
                       <button onClick={() => {
                         setSchedule((prev: any) => {
                           const copy = { ...prev };
                           copy[idx] = null;
                           return copy;
                         });
                         setEditingDay(null);
                         setConfirmClearDay(null);
                       }} className="py-2 px-4 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-lg transition-colors">Sure?</button>
                       <button onClick={() => setConfirmClearDay(null)} className="py-2 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-bold rounded-lg transition-colors">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmClearDay(idx)} className="py-2 px-4 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-sm font-bold rounded-lg border border-red-500/20">
                      Clear Day
                    </button>
                  )}
                </div>
              </div>
            ) : dayRoutine ? (
              <div className="space-y-2">
                {dayRoutine.exercises.map((ex, i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-2 bg-neutral-950 rounded-lg border border-neutral-800">
                    <span className="font-bold text-neutral-300">{ex.name}</span>
                    <span className="text-neutral-500 font-medium">{ex.sets} sets x {ex.target}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500 italic">No exercises scheduled.</p>
            )}
          </div>
        )
      })}
      </div>
      )}
    </div>
  );
}

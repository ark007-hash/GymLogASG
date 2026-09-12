import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Minus, Plus, Check, X, ChevronDown, ChevronUp, Timer } from 'lucide-react';
import { ExerciseDef, LoggedSet } from './types';

export function RestTimer({ defaultTime = 90, soundEnabled = true, vibrateEnabled = true }: { defaultTime?: number, soundEnabled?: boolean, vibrateEnabled?: boolean }) {
  const [timeLeft, setTimeLeft] = useState(defaultTime);
  const [isActive, setIsActive] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const alarmIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (!isActive && !showNotification) setTimeLeft(defaultTime);
  }, [defaultTime, isActive, showNotification]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      setShowNotification(true);
      setIsMinimized(false); // Auto-maximize when timer finishes
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  useEffect(() => {
    if (showNotification) {
      const playAlarm = () => {
        if (soundEnabled) {
          try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
              const ctx = new AudioContext();
              const playBeep = (timeOffset: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime + timeOffset); // A5 note
                
                gain.gain.setValueAtTime(0, ctx.currentTime + timeOffset);
                gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + timeOffset + 0.02); // Quick fade in
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + 0.4); // Longer fade out
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.start(ctx.currentTime + timeOffset);
                osc.stop(ctx.currentTime + timeOffset + 0.5);
              };

              playBeep(0);
              playBeep(0.15); // Second gentle chime shortly after
            }
          } catch (e) {
            console.warn('Audio not supported', e);
          }
        }
        
        if (vibrateEnabled && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      };

      playAlarm(); // Play immediately
      alarmIntervalRef.current = setInterval(playAlarm, 2000); // Repeat every 2 seconds
    } else {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
      }
    }
    
    return () => {
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    };
  }, [showNotification, soundEnabled, vibrateEnabled]);

  const dismissAlarm = () => {
    setShowNotification(false);
    setTimeLeft(defaultTime);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`w-full bg-[#1c1c1e] border-t border-neutral-800 transition-all shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-40 rounded-t-3xl relative ${isMinimized ? 'p-2' : 'p-3'}`}>
      {showNotification && (
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-emerald-600 text-white pl-5 pr-2 py-2 rounded-full text-sm font-bold shadow-lg animate-bounce flex items-center gap-3 whitespace-nowrap">
          <span>Rest complete</span>
          <button onClick={dismissAlarm} className="bg-emerald-700/50 hover:bg-emerald-700 p-1 rounded-full transition-colors">
            <X size={16} />
          </button>
        </div>
      )}
      {isMinimized ? (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <Timer size={16} className={isActive ? "text-blue-500" : "text-neutral-500"} />
            <span className={`font-mono font-bold ${isActive ? 'text-white' : 'text-neutral-500'}`}>{formatTime(timeLeft)}</span>
          </div>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-2 text-neutral-400 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-widest"
          >
            Expand <ChevronUp size={14} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isActive && (
              <button onClick={() => setTimeLeft(t => Math.max(15, t - 15))} className="p-2 -mr-1 text-neutral-500 hover:text-white transition-colors">
                <Minus size={16} />
              </button>
            )}
            <div className="text-2xl font-bold font-mono w-[3.8rem] text-center text-white tabular-nums tracking-tighter">{formatTime(timeLeft)}</div>
            {!isActive && (
              <button onClick={() => setTimeLeft(t => t + 15)} className="p-2 -ml-1 text-neutral-500 hover:text-white transition-colors">
                <Plus size={16} />
              </button>
            )}
            <div className="flex flex-col ml-2">
              <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest leading-tight">Rest<br/>Timer</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsActive(!isActive)}
              className={`p-3 rounded-full transition-colors text-white ${isActive ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-600 hover:bg-blue-500'}`}
            >
              {isActive ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
            </button>
            <button
              onClick={() => { setIsActive(false); setShowNotification(false); setTimeLeft(defaultTime); }}
              className="p-3 bg-neutral-800 rounded-full hover:bg-neutral-700 active:bg-neutral-600 transition-colors text-white"
            >
              <RotateCcw size={20} />
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 text-neutral-500 hover:text-white transition-colors ml-1"
            >
              <ChevronDown size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ExerciseCardProps {
  key?: string | number;
  exercise: ExerciseDef;
  sessionData: LoggedSet[];
  previousData: LoggedSet[] | null;
  onUpdateSet: (index: number, set: LoggedSet) => void;
  onUpdateAllSets?: (sets: LoggedSet[]) => void;
  readOnly?: boolean;
  enableWarmup?: boolean;
}

export function ExerciseCard({ exercise, sessionData, previousData, onUpdateSet, onUpdateAllSets, readOnly, enableWarmup }: ExerciseCardProps) {
  // Ensure we have enough sets initialized, accounting for warm-ups and target sets
  const numTargetSets = exercise.sets;
  const numWarmupSets = sessionData.filter(s => s?.isWarmup).length;
  const totalExpectedSets = numTargetSets + numWarmupSets;
  
  const sets = Array.from({ length: Math.max(sessionData.length, totalExpectedSets) }, (_, i) => {
    return sessionData[i] || { weight: '', reps: '', duration: '', completed: false };
  });

  const handleAddWarmup = () => {
    if (!onUpdateAllSets) return;
    const newSets = [...sets];
    // Find the first index that is NOT a warmup
    const firstWorkingSetIdx = newSets.findIndex(s => !s.isWarmup);
    const insertIdx = firstWorkingSetIdx === -1 ? newSets.length : firstWorkingSetIdx;
    
    newSets.splice(insertIdx, 0, { weight: '', reps: '', duration: '', completed: false, isWarmup: true });
    onUpdateAllSets(newSets);
  };
  
  const handleRemoveSet = (index: number) => {
    if (!onUpdateAllSets || readOnly) return;
    const newSets = sets.filter((_, i) => i !== index);
    onUpdateAllSets(newSets);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden mb-4 shadow-sm">
      <div className="p-5 border-b border-neutral-800/80 bg-neutral-900/50">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg text-white mb-1">{exercise.name}</h3>
            <p className="text-sm text-blue-400 font-medium">Target: {exercise.target}</p>
          </div>
          {enableWarmup && !readOnly && (
            <button onClick={handleAddWarmup} className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded-lg border border-neutral-700 transition-colors font-bold uppercase tracking-wider flex items-center gap-1">
              <Plus size={14} /> Warm-up
            </button>
          )}
        </div>

        <div className="mt-4 p-3 bg-neutral-950 rounded-lg text-sm border border-neutral-800/50">
          <div className="font-bold text-neutral-500 mb-2 text-[10px] uppercase tracking-widest">Last time:</div>
          {previousData ? (
            <ul className="space-y-1.5">
              {previousData.map((s, i) => {
                if (!s || s.isWarmup) return null; // Hide warmups in 'Last time' or show them differently? Better to just show them but indicate.
                return (
                <li key={i} className="flex items-center gap-2 text-neutral-300">
                  <span className="text-neutral-500 font-mono text-xs w-4">{i+1}.</span>
                  {exercise.type === 'resistance'
                    ? <span><strong className="text-white">{s.weight || '0'} kg</strong> × {s.reps || '0'}</span>
                    : <span><strong className="text-white">{s.duration || '0'}</strong></span>}
                </li>
              )})}
            </ul>
          ) : (
            <p className="text-neutral-500 italic">No previous log</p>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {sets.map((set, i) => {
          let workingSetNum = 0;
          for (let j = 0; j <= i; j++) {
            if (!sets[j].isWarmup) workingSetNum++;
          }
          
          return (
          <div key={i} className={`relative flex flex-col gap-3 p-3 rounded-xl border transition-colors ${set.completed ? 'bg-emerald-950/20 border-emerald-900/30' : set.isWarmup ? 'bg-orange-950/10 border-orange-900/30' : 'bg-neutral-950 border-neutral-800'}`}>
            <div className="flex justify-between items-center">
              <div className={`font-bold text-[10px] uppercase tracking-widest ${set.isWarmup ? 'text-orange-500' : 'text-neutral-500'}`}>
                {set.isWarmup ? 'Warm-up Set' : `Set ${workingSetNum}`}
              </div>
              {set.isWarmup && !readOnly && !set.completed && (
                <button onClick={() => handleRemoveSet(i)} className="text-red-500 hover:text-red-400 p-1">
                  <Minus size={14} />
                </button>
              )}
            </div>
            
            {exercise.type === 'resistance' ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] font-medium text-neutral-400 block mb-1.5 uppercase tracking-wide">Weight (kg)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      disabled={readOnly || set.completed}
                      value={set.weight}
                      onChange={e => onUpdateSet(i, { ...set, weight: e.target.value })}
                      className="w-full p-2 text-base font-bold bg-neutral-800 rounded-lg text-white border-none focus:ring-2 focus:ring-blue-500 transition-shadow disabled:opacity-50 disabled:bg-neutral-900"
                      placeholder="e.g. 20"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-medium text-neutral-400 block mb-1.5 uppercase tracking-wide">Reps</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      disabled={readOnly || set.completed}
                      value={set.reps}
                      onChange={e => onUpdateSet(i, { ...set, reps: e.target.value })}
                      className="w-full p-2 text-base font-bold bg-neutral-800 rounded-lg text-white border-none focus:ring-2 focus:ring-blue-500 transition-shadow disabled:opacity-50 disabled:bg-neutral-900"
                      placeholder="e.g. 10"
                    />
                  </div>
                </div>
              </>
            ) : exercise.type === 'cardio' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-neutral-400 block mb-1.5 uppercase tracking-wide">Duration</label>
                  <input
                    type="text"
                    disabled={readOnly || set.completed}
                    value={set.duration}
                    onChange={e => onUpdateSet(i, { ...set, duration: e.target.value })}
                    className="w-full p-2 text-base font-bold bg-neutral-800 rounded-lg text-white border-none focus:ring-2 focus:ring-blue-500 transition-shadow disabled:opacity-50 disabled:bg-neutral-900"
                    placeholder="e.g. 20 mins"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-neutral-400 block mb-1.5 uppercase tracking-wide">Distance</label>
                  <input
                    type="text"
                    disabled={readOnly || set.completed}
                    value={set.distance || ''}
                    onChange={e => onUpdateSet(i, { ...set, distance: e.target.value })}
                    className="w-full p-2 text-base font-bold bg-neutral-800 rounded-lg text-white border-none focus:ring-2 focus:ring-blue-500 transition-shadow disabled:opacity-50 disabled:bg-neutral-900"
                    placeholder="e.g. 3 km"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-neutral-400 block mb-1.5 uppercase tracking-wide">Pace</label>
                  <input
                    type="text"
                    disabled={readOnly || set.completed}
                    value={set.pace || ''}
                    onChange={e => onUpdateSet(i, { ...set, pace: e.target.value })}
                    className="w-full p-2 text-base font-bold bg-neutral-800 rounded-lg text-white border-none focus:ring-2 focus:ring-blue-500 transition-shadow disabled:opacity-50 disabled:bg-neutral-900"
                    placeholder="e.g. 6:00/km"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-neutral-400 block mb-1.5 uppercase tracking-wide">Incline</label>
                  <input
                    type="text"
                    disabled={readOnly || set.completed}
                    value={set.incline || ''}
                    onChange={e => onUpdateSet(i, { ...set, incline: e.target.value })}
                    className="w-full p-2 text-base font-bold bg-neutral-800 rounded-lg text-white border-none focus:ring-2 focus:ring-blue-500 transition-shadow disabled:opacity-50 disabled:bg-neutral-900"
                    placeholder="e.g. 2.0"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <label className="text-[11px] font-medium text-neutral-400 block mb-1.5 uppercase tracking-wide">Duration / Time</label>
                <input
                  type="text"
                  disabled={readOnly || set.completed}
                  value={set.duration}
                  onChange={e => onUpdateSet(i, { ...set, duration: e.target.value })}
                  className="w-full p-2 text-base font-bold bg-neutral-800 rounded-lg text-white border-none focus:ring-2 focus:ring-blue-500 transition-shadow disabled:opacity-50 disabled:bg-neutral-900"
                  placeholder="e.g. 60s"
                />
              </div>
            )}
            
            <div className={`flex items-center gap-3 mt-1 pt-3 border-t border-neutral-800/50 ${((exercise.type === 'resistance' && (!set.weight || !set.reps)) || (exercise.type !== 'resistance' && !set.duration) || readOnly) ? 'opacity-50' : ''}`}>
              <span className={`text-sm font-bold ${set.completed ? 'text-emerald-400' : 'text-neutral-500'}`}>
                {set.completed ? 'Set Completed' : 'Pending'}
              </span>
            </div>
          </div>
          );
        })}
      </div>
      
      {!readOnly && (
        <div className="p-3 pt-0 mt-2 border-t border-neutral-800/50">
          <button 
            onClick={() => {
              const allCompleted = sets.every(s => s.completed);
              if (allCompleted) {
                if (onUpdateAllSets) {
                  onUpdateAllSets(sets.map(s => ({ ...s, completed: false })));
                } else {
                  sets.forEach((set, i) => onUpdateSet(i, { ...set, completed: false }));
                }
              } else {
                if (onUpdateAllSets) {
                  onUpdateAllSets(sets.map(s => ({ ...s, completed: true })));
                } else {
                  sets.forEach((set, i) => onUpdateSet(i, { ...set, completed: true }));
                }
              }
            }}
            className={`w-full py-4 rounded-xl font-bold transition-colors ${
              sets.every(s => s.completed) 
                ? 'bg-emerald-950/40 text-emerald-500 border border-emerald-900/50 hover:bg-emerald-900/30'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
            }`}
          >
            {sets.every(s => s.completed) ? 'Exercise Completed (Tap to Edit)' : 'Complete Exercise'}
          </button>
        </div>
      )}
    </div>
  );
}

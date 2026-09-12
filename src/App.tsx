/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Dumbbell, History, LineChart, Settings, ClipboardList, Undo2, Cloud } from 'lucide-react';
import { WorkoutView, HistoryView, ProgressView, SettingsView, RoutinesView } from './views';
import { RestTimer } from './components';
import { WorkoutSession, WorkoutDay, ExerciseDef } from './types';
import { SCHEDULE as DEFAULT_SCHEDULE } from './data';
import { useCloudSync } from './useCloudSync';

// Simple hook for localStorage
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      });
    } catch (error) {
      console.error(error);
    }
  };
  return [storedValue, setValue] as const;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'workout' | 'history' | 'progress' | 'routines' | 'settings'>('workout');
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [history, setHistory] = useLocalStorage<WorkoutSession[]>('gymlog_history', []);
  const [currentWorkout, setCurrentWorkout] = useLocalStorage<WorkoutSession | null>('gymlog_current', null);
  const [restTimerDefault, setRestTimerDefault] = useLocalStorage<number>('gymlog_rest_timer', 90);
  const [schedule, setSchedule] = useLocalStorage<Record<number, WorkoutDay | null>>('gymlog_schedule', DEFAULT_SCHEDULE);
  const [fontSize, setFontSize] = useLocalStorage<string>('gymlog_font_size', '16px');
  const [enableWarmup, setEnableWarmup] = useLocalStorage<boolean>('gymlog_enable_warmup', false);
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>('gymlog_sound_enabled', true);
  const [vibrateEnabled, setVibrateEnabled] = useLocalStorage<boolean>('gymlog_vibrate_enabled', true);
  const [timerEnabled, setTimerEnabled] = useLocalStorage<boolean>('gymlog_timer_enabled', true);
  const [customPresets, setCustomPresets] = useLocalStorage<ExerciseDef[]>('gymlog_custom_presets', [
    { name: 'Squat', sets: 3, target: '10 reps', type: 'resistance' },
    { name: 'Bench Press', sets: 3, target: '10 reps', type: 'resistance' }
  ]);

  const { user, login, logout, isSyncing, lastSynced } = useCloudSync(
    history, setHistory,
    currentWorkout, setCurrentWorkout,
    schedule, setSchedule,
    customPresets, setCustomPresets
  );

  useEffect(() => {
    document.documentElement.style.fontSize = fontSize;
  }, [fontSize]);

  const handleUpdateWorkout = (workout: WorkoutSession) => {
    setCurrentWorkout(workout);
    // If updating an already finished workout, sync it back to history
    if (workout.isFinished) {
      setHistory(prev => prev.map(w => w.id === workout.id ? workout : w));
    }
  };

  const handleFinishWorkout = () => {
    if (!currentWorkout) return;
    const finished = { ...currentWorkout, isFinished: true, finishedAt: new Date().toISOString() };
    setCurrentWorkout(finished);

    setHistory(prev => {
      const exists = prev.find(w => w.id === finished.id);
      if (exists) {
         return prev.map(w => w.id === finished.id ? finished : w);
      }
      return [finished, ...prev];
    });
  };

  const [globalUndoStack, setGlobalUndoStack] = useState<{ history: WorkoutSession[], currentWorkout: WorkoutSession | null, schedule: Record<number, WorkoutDay | null>, customPresets: ExerciseDef[] }[]>([]);

  const saveForUndo = () => {
    setGlobalUndoStack(prev => [...prev, { history, currentWorkout, schedule, customPresets }]);
  };

  const handleGlobalUndo = () => {
    if (globalUndoStack.length === 0) return;
    const previousState = globalUndoStack[globalUndoStack.length - 1];
    setGlobalUndoStack(prev => prev.slice(0, -1));
    setHistory(previousState.history);
    setCurrentWorkout(previousState.currentWorkout);
    setSchedule(previousState.schedule);
    setCustomPresets(previousState.customPresets);
  };

  const handleDeleteWorkout = (id: string) => {
    saveForUndo();
    setHistory(prev => prev.filter(w => w.id !== id));
    if (currentWorkout?.id === id) {
       setCurrentWorkout(null);
    }
  };

  const handleImport = (data: any) => {
    if (data.history) setHistory(data.history);
    if (data.currentWorkout) setCurrentWorkout(data.currentWorkout);
  };

  return (
    <div className="h-[100dvh] w-full bg-neutral-950 text-neutral-100 font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col">
      <div className="max-w-md w-full mx-auto relative h-full flex flex-col border-x border-neutral-900 shadow-2xl bg-neutral-950">
        
        {/* Top Header */}
        <header id="main-header" className="flex-none z-30 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-900 p-3 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div id="app-header-logo" className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
               <Dumbbell id="app-header-dumbbell-icon" className="text-white" size={20} />
             </div>
             <h1 id="app-title" className="font-black text-xl tracking-tight text-white">GymLog</h1>
           </div>
           
           <div className="flex items-center gap-3">
             {user && (
               <div className="flex items-center gap-1.5" title={isSyncing ? "Syncing..." : lastSynced ? `Last synced: ${lastSynced.toLocaleTimeString()}` : "Cloud Sync Active"}>
                 <Cloud size={16} className={isSyncing ? "text-blue-500 animate-pulse" : "text-green-500"} />
               </div>
             )}
             {globalUndoStack.length > 0 && (
               <button onClick={handleGlobalUndo} className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg border border-neutral-800 transition-colors flex items-center gap-2" title="Undo Last Action">
                 <Undo2 size={18} />
               </button>
             )}
           </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto relative pb-32">
          {activeTab === 'workout' && (
            <WorkoutView
              history={history}
              currentWorkout={currentWorkout}
              onUpdateWorkout={handleUpdateWorkout}
              onFinishWorkout={handleFinishWorkout}
              viewDate={viewDate}
              setViewDate={setViewDate}
              schedule={schedule}
              setSchedule={setSchedule}
              enableWarmup={enableWarmup}
              customPresets={customPresets}
              saveForUndo={saveForUndo}
            />
          )}
          {activeTab === 'history' && (
            <HistoryView 
              history={history} 
              onDelete={handleDeleteWorkout}
              onEdit={(dateStr) => {
                const sessionToEdit = history.find(s => s.date === dateStr);
                if (sessionToEdit) {
                   const restored = { ...sessionToEdit, isFinished: false };
                   setCurrentWorkout(restored);
                }
                const [y, m, d] = dateStr.split('-');
                setViewDate(new Date(Number(y), Number(m)-1, Number(d)));
                setActiveTab('workout');
              }}
              saveForUndo={saveForUndo}
            />
          )}
          {activeTab === 'progress' && <ProgressView history={history} schedule={schedule} />}
          {activeTab === 'routines' && (
            <RoutinesView schedule={schedule} setSchedule={(newSchedule) => { saveForUndo(); setSchedule(newSchedule); }} history={history} />
          )}
          {activeTab === 'settings' && (
            <SettingsView 
              history={history} 
              currentWorkout={currentWorkout} 
              onImport={handleImport} 
              restTimerDefault={restTimerDefault}
              onUpdateRestTimer={setRestTimerDefault}
              fontSize={fontSize}
              setFontSize={setFontSize}
              enableWarmup={enableWarmup}
              setEnableWarmup={setEnableWarmup}
              soundEnabled={soundEnabled}
              setSoundEnabled={setSoundEnabled}
              vibrateEnabled={vibrateEnabled}
              setVibrateEnabled={setVibrateEnabled}
              timerEnabled={timerEnabled}
              setTimerEnabled={setTimerEnabled}
              customPresets={customPresets}
              setCustomPresets={(newPresets) => { saveForUndo(); setCustomPresets(newPresets); }}
              cloudSync={{ user, login, logout, isSyncing, lastSynced }}
            />
          )}
        </main>

        {/* Global Rest Timer */}
        {timerEnabled && (
          <div className="flex-none relative">
            <RestTimer defaultTime={restTimerDefault} soundEnabled={soundEnabled} vibrateEnabled={vibrateEnabled} />
          </div>
        )}

        {/* Bottom Navigation Bar */}
        <nav className="flex-none bg-neutral-950 border-t border-neutral-900 pb-2 sm:pb-0 z-50">
          <div className="max-w-md mx-auto flex">
            <button
              onClick={() => setActiveTab('workout')}
              className={`flex-1 py-3 flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'workout' ? 'text-blue-500' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <Dumbbell size={20} strokeWidth={activeTab === 'workout' ? 2.5 : 2} />
              <span className="text-[9px] font-black uppercase tracking-wider">Workout</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'history' ? 'text-blue-500' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <History size={20} strokeWidth={activeTab === 'history' ? 2.5 : 2} />
              <span className="text-[9px] font-black uppercase tracking-wider">History</span>
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`flex-1 py-3 flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'progress' ? 'text-blue-500' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <LineChart size={20} strokeWidth={activeTab === 'progress' ? 2.5 : 2} />
              <span className="text-[9px] font-black uppercase tracking-wider">Progress</span>
            </button>
            <button
              onClick={() => setActiveTab('routines')}
              className={`flex-1 py-3 flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'routines' ? 'text-blue-500' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <ClipboardList size={20} strokeWidth={activeTab === 'routines' ? 2.5 : 2} />
              <span className="text-[9px] font-black uppercase tracking-wider">Routines</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-3 flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'settings' ? 'text-blue-500' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <Settings size={20} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
              <span className="text-[9px] font-black uppercase tracking-wider">Settings</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}

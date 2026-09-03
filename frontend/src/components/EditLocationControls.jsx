import React, { useState } from 'react';
import { Edit3, Check, Save, RotateCcw, AlertTriangle } from 'lucide-react';

export default function EditLocationControls({
  isEditMode = false,
  hasUnsavedChanges = false,
  onToggleEditMode = () => {},
  onSaveLayout = () => {},
  onResetPositions = () => {},
  onDiscardChanges = () => {},
}) {
  const [showResetModal, setShowResetModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const handleToggle = () => {
    if (isEditMode && hasUnsavedChanges) {
      setShowExitModal(true);
    } else {
      onToggleEditMode(!isEditMode);
    }
  };

  const handleConfirmReset = () => {
    setShowResetModal(false);
    onResetPositions();
  };

  const handleSaveAndExit = () => {
    setShowExitModal(false);
    onSaveLayout();
    onToggleEditMode(false);
  };

  const handleDiscardAndExit = () => {
    setShowExitModal(false);
    onDiscardChanges();
    onToggleEditMode(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Top Toggle & Control Buttons Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Main Mode Toggle Button */}
        <button
          onClick={handleToggle}
          aria-label={isEditMode ? 'Done editing map locations' : 'Edit map node locations'}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all ${
            isEditMode
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-400/50'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          {isEditMode ? (
            <>
              <Check className="w-3.5 h-3.5 text-slate-950 font-bold" />
              <span>✓ Done Editing</span>
            </>
          ) : (
            <>
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>✏️ Edit Locations</span>
            </>
          )}
        </button>

        {/* Action Controls Visible Only in Edit Mode */}
        {isEditMode && (
          <>
            {/* Save Layout Button */}
            <button
              onClick={onSaveLayout}
              disabled={!hasUnsavedChanges}
              title="Save current layout to local IndexedDB"
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>💾 Save Layout</span>
            </button>

            {/* Reset Positions Button */}
            <button
              onClick={() => setShowResetModal(true)}
              title="Reset all node locations to default positions"
              className="px-3 py-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>↩ Reset Positions</span>
            </button>

            {/* Unsaved Changes Indicator Badge */}
            {hasUnsavedChanges && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Unsaved layout changes</span>
              </span>
            )}
          </>
        )}
      </div>

      {/* Edit Mode Instruction & Safety Warning Banner */}
      {isEditMode && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-300 flex items-start gap-2 shadow-inner">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-amber-200">Drag nodes to reposition them.</div>
            <div className="text-[11px] text-amber-400/90">
              ⚠️ Editing locations changes map visualization only. It does not change road connectivity or routing logic.
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-rose-400" />
              Reset Node Positions?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Reset all node positions to the original default layout? This will clear saved custom coordinates from local IndexedDB storage.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg"
              >
                Reset Layout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Unsaved Changes Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              You Have Unsaved Location Changes
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Would you like to save your custom node layout changes to local storage before exiting edit mode?
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowExitModal(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscardAndExit}
                className="px-3.5 py-1.5 bg-rose-900/40 border border-rose-700 text-rose-300 hover:bg-rose-800/60 rounded-xl text-xs font-semibold"
              >
                Discard
              </button>
              <button
                onClick={handleSaveAndExit}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg"
              >
                Save &amp; Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

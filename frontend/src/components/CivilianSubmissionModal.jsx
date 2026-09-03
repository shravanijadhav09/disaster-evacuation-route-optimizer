import React from 'react';

export default function CivilianSubmissionModal({ submission, onClose }) {
  if (!submission) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-md animate-fade-in">
      <div className="bg-slate-950 border border-emerald-500/50 rounded-2xl max-w-md w-full p-lg shadow-2xl space-y-md text-center text-slate-100">
        {/* Success Icon Badge */}
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-4xl">mark_email_read</span>
        </div>

        {/* Title & Headline */}
        <div>
          <h3 className="font-headline-sm text-headline-sm font-extrabold text-emerald-400">
            ✓ REQUEST SENT TO DISASTER COMMAND
          </h3>
          <p className="font-body-sm text-slate-300 mt-xs">
            Your disaster report has been submitted successfully and sent to the Emergency Operations Center.
          </p>
        </div>

        {/* Details Box */}
        <div className="bg-slate-900/90 p-md rounded-xl border border-slate-800 text-left text-label-sm space-y-xs">
          <div className="flex justify-between items-center pb-xs border-b border-slate-800">
            <span className="text-slate-400 font-medium">Incident Title:</span>
            <span className="font-bold text-slate-100 truncate max-w-[180px]">{submission.title}</span>
          </div>

          <div className="flex justify-between items-center pb-xs border-b border-slate-800">
            <span className="text-slate-400 font-medium">Current Status:</span>
            <span className="px-xs py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              🟢 PENDING APPROVAL
            </span>
          </div>

          {submission.affected_roads && submission.affected_roads.length > 0 && (
            <div className="flex justify-between items-center pb-xs border-b border-slate-800">
              <span className="text-slate-400 font-medium">Affected Roads:</span>
              <span className="font-bold text-slate-100">{submission.affected_roads.join(', ')}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-xs text-xs text-slate-400">
            <span>Report Reference:</span>
            <span className="font-mono font-semibold text-emerald-400">{submission.id || 'SUBMITTED'}</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-sm bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-label-md transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-xs"
        >
          <span className="material-symbols-outlined text-body-md">check_circle</span>
          <span>OK, Got It</span>
        </button>
      </div>
    </div>
  );
}

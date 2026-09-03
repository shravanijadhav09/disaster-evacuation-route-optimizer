import React from 'react';

export default function NotificationToast({ notifications = [], onDismiss, onReviewRequest }) {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col space-y-sm max-w-md w-full pointer-events-none">
      {notifications.map((toast) => {
        const isNewRequest = toast.type === 'NEW_REQUEST' || toast.type === 'PENDING';
        const isCivilianSubmitted = toast.type === 'CIVILIAN_SUBMITTED';
        const isApproved = toast.type === 'APPROVED';
        const isRejected = toast.type === 'REJECTED';
        const isResolved = toast.type === 'RESOLVED';
        const isInfo = toast.type === 'INFO';

        let iconName = 'info';
        let bgStyle = 'bg-blue-950/95 border-blue-500/50 text-slate-100 shadow-2xl';
        let iconBgStyle = 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
        let titleColor = 'text-blue-400';

        if (isNewRequest || isCivilianSubmitted) {
          iconName = 'hourglass_top';
          bgStyle = 'bg-amber-950/95 border-amber-500/60 text-amber-100 shadow-2xl';
          iconBgStyle = 'bg-amber-500/20 text-amber-400 border border-amber-500/40';
          titleColor = 'text-amber-400';
        } else if (isApproved) {
          iconName = 'warning';
          bgStyle = 'bg-rose-950/95 border-rose-500/60 text-slate-100 shadow-2xl';
          iconBgStyle = 'bg-rose-500/20 text-rose-400 border border-rose-500/40';
          titleColor = 'text-rose-400';
        } else if (isRejected) {
          iconName = 'cancel';
          bgStyle = 'bg-slate-900/95 border-slate-600 text-slate-200 shadow-2xl';
          iconBgStyle = 'bg-slate-800 text-slate-300 border border-slate-700';
          titleColor = 'text-slate-300';
        } else if (isResolved) {
          iconName = 'task_alt';
          bgStyle = 'bg-emerald-950/95 border-emerald-500/60 text-slate-100 shadow-2xl';
          iconBgStyle = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
          titleColor = 'text-emerald-400';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-md rounded-2xl border flex items-start gap-md backdrop-blur-md transition-all animate-fade-in ${bgStyle}`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${iconBgStyle}`}>
              <span className="material-symbols-outlined text-2xl">{iconName}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className={`font-headline-xs text-headline-xs font-extrabold flex items-center justify-between ${titleColor}`}>
                <span>{toast.title}</span>
              </div>

              {toast.message && (
                <div className="text-body-sm mt-0.5 text-slate-200 font-medium">
                  {toast.message}
                </div>
              )}

              {toast.details && (
                <div className="mt-xs text-label-xs space-y-0.5 text-slate-300">
                  {toast.details.road && <div><strong className="text-slate-100">Road:</strong> {toast.details.road}</div>}
                  {toast.details.severity && <div><strong className="text-slate-100">Severity:</strong> {toast.details.severity}</div>}
                  {toast.details.impact && <div><strong className="text-slate-100">Impact:</strong> {toast.details.impact}</div>}
                  {toast.details.status && <div><strong className="text-slate-100">Status:</strong> {toast.details.status}</div>}
                </div>
              )}

              {isNewRequest && (
                <div className="mt-sm flex items-center gap-xs">
                  <button
                    onClick={() => {
                      if (onReviewRequest) onReviewRequest(toast.disasterId);
                      if (onDismiss) onDismiss(toast.id);
                    }}
                    className="px-sm py-xs bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-label-xs cursor-pointer transition-all active:scale-95 flex items-center gap-xs shadow-md"
                  >
                    <span className="material-symbols-outlined text-xs">rate_review</span>
                    Review Request
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => onDismiss && onDismiss(toast.id)}
              className="p-xs text-slate-400 hover:text-slate-100 rounded-full hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-body-md">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

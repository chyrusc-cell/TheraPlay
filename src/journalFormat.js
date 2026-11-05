// Shared by the session journal form/history and the admin Activity Feedback list.

// Same limit as the server (ActivityJournalController::NOTE_MAX).
export const NOTE_MAX = 5000;

export const formatSessionDate = (value) =>
    value
        ? new Date(value).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
          })
        : '';

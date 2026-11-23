import { useState } from 'react';
import { resApi, resUseLive, resTimeAgo } from '../resApi.jsx';

export default function ResNotifications() {
  const { resData, resReload } = resUseLive('/notifications', ['notifications', 'queue', 'missions', 'surplus']);
  const [resOpen, resSetOpen] = useState(false);

  async function resReadAll() {
    await resApi('/notifications/read-all', { method: 'POST' });
    resReload();
  }

  const resUnread = resData?.unread || 0;
  return (
    <div className="notes">
      <button className="notes-btn" onClick={() => resSetOpen(!resOpen)} aria-expanded={resOpen}>
        Notifications
        {resUnread > 0 && <span className="notes-count">{resUnread}</span>}
      </button>
      {resOpen && (
        <div className="notes-panel" role="dialog" aria-label="Notifications">
          <div className="notes-top">
            <strong>Notifications</strong>
            {resUnread > 0 && <button className="link-btn dark" onClick={resReadAll}>Mark all read</button>}
          </div>
          {!resData?.items?.length ? (
            <p className="muted small">Nothing yet.</p>
          ) : (
            <ul>
              {resData.items.map((resN) => (
                <li key={resN.id} className={`note note-${resN.type}${Number(resN.is_read) ? '' : ' is-new'}`}>
                  <strong>{resN.title}</strong>
                  <span>{resN.message}</span>
                  <time className="muted small">{resTimeAgo(resN.created_at)}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

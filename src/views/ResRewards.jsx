import { resUseLive } from '../resApi.jsx';
import { ResPage } from '../components/ResShared.jsx';

const RES_BADGES = [
  ['Novice Responder', 0],
  ['Bronze Responder', 100],
  ['Silver Vanguard', 250],
  ['Gold Guardian', 500],
];

export default function ResRewards({ user: resUser }) {
  const { resData: resMe } = resUseLive('/me', ['missions']);
  const { resData: resBoard } = resUseLive('/leaderboard', ['missions']);
  const resVol = resMe?.volunteer;
  const resXp = resVol?.xp || 0;
  const resNext = RES_BADGES.find(([, resNeed]) => resNeed > resXp);

  return (
    <ResPage title="Rewards" intro="Every completed mission gives +50 XP and +20 coins. The database trigger trg_mission_reward adds them and updates your badge.">
      {resVol && (
        <div className="tiles">
          <div className="tile"><span className="tile-num">{resVol.xp}</span><span>XP</span></div>
          <div className="tile"><span className="tile-num">{resVol.coins}</span><span>Coins</span></div>
          <div className="tile"><span className="tile-num">{resVol.level}</span><span>Level</span></div>
          <div className="tile"><span className="tile-num">{resVol.completed_missions}</span><span>Missions completed</span></div>
        </div>
      )}
      <div className="split">
        <section className="panel">
          <h2>Badges</h2>
          <ul className="badges">
            {RES_BADGES.map(([resName, resNeed]) => (
              <li key={resName} className={resXp >= resNeed ? 'got' : ''}>
                <strong>{resName}</strong>
                <span className="muted small">{resNeed} XP</span>
              </li>
            ))}
          </ul>
          {resNext && <p className="muted">{resNext[1] - resXp} XP more for {resNext[0]}.</p>}
        </section>
        <section className="panel">
          <h2>Leaderboard</h2>
          {!resBoard ? <p className="muted">Loading…</p> : (
            <ol className="board">
              {resBoard.map((resB) => (
                <li key={resB.user_id} className={resB.user_id === resUser.id ? 'is-me' : ''}>
                  <span>{resB.name} <span className="muted small">{resB.badge}</span></span>
                  <span className="muted small">{resB.completed_missions} missions</span>
                  <span className="num">{resB.xp} XP</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </ResPage>
  );
}

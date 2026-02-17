import shas from '../../shas.json';

const SEDER_HEBREW: Record<string, string> = {
  Zeraim: 'סדר זרעים',
  Moed: 'סדר מועד',
  Nashim: 'סדר נשים',
  Nezikin: 'סדר נזיקין',
  Kodashim: 'סדר קדשים',
  Tahorot: 'סדר טהרות',
};

export default function Home() {
  return (
    <>
      <div className="hero">
        <img src="/hero.jpeg" alt="" />
        <div className="hero-overlay">
          <p className="hero-subtitle">לימוד הש״ס</p>
        </div>
      </div>

      <main className="content">
        {shas.sedarim.map((seder) => (
          <section key={seder.name} className="seder-section">
            <h2 className="seder-title">{SEDER_HEBREW[seder.name] || seder.name}</h2>
            <div className="massekhtot-grid">
              {seder.massekhtot.map((m) => (
                <div key={m.name} className="masekhet-card">
                  <div className="masekhet-name">{m.hebrewName}</div>
                  <div className="masekhet-info">{m.dappim} דפים</div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}

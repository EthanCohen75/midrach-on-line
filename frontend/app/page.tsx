import shas from '../../shas.json';

export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Midrach Online</h1>
      <p>Étude du Talmud Bavli</p>

      {shas.sedarim.map((seder) => (
        <section key={seder.name} style={{ marginTop: '2rem' }}>
          <h2>{seder.name}</h2>
          <ul>
            {seder.massekhtot.map((m) => (
              <li key={m.name}>
                <strong>{m.hebrewName}</strong> — {m.name} ({m.dappim} dappim, {m.range})
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

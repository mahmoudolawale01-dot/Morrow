import { defaultProducts } from '@/lib/api/legacy-contract';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1100px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <p style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666', fontSize: '0.8rem' }}>Morrow Objects</p>
        <h1 style={{ fontSize: '3rem', margin: '0.25rem 0 0.75rem' }}>Thoughtful home pieces for slower living.</h1>
        <p style={{ fontSize: '1.1rem', color: '#4a4a4a', maxWidth: '760px' }}>
          A live storefront foundation with product catalog, sign-in, and checkout-ready order flow.
        </p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        {defaultProducts.map((product) => (
          <article key={product.id} style={{ border: '1px solid #e8e1d8', borderRadius: '18px', overflow: 'hidden', background: '#fffaf5' }}>
            <img src={product.image} alt={product.imageAlt} style={{ display: 'block', width: '100%', height: '220px', objectFit: 'cover' }} />
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7a5b3f' }}>{product.tag || 'Featured'}</span>
                <strong>${product.price}</strong>
              </div>
              <h2 style={{ margin: '0.75rem 0 0.5rem', fontSize: '1.2rem' }}>{product.name}</h2>
              <p style={{ margin: 0, color: '#5c5c5c', lineHeight: 1.5 }}>{product.description}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

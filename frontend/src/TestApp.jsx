export default function TestApp() {
    return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h1 style={{ color: 'blue', fontSize: '3rem' }}>✅ React is Working!</h1>
            <p style={{ fontSize: '1.5rem', marginTop: '1rem' }}>If you see this, the app is loading correctly.</p>
            <a href="/products" style={{ display: 'inline-block', marginTop: '2rem', padding: '1rem 2rem', background: 'blue', color: 'white', borderRadius: '8px', textDecoration: 'none' }}>
                Go to Products
            </a>
        </div>
    );
}

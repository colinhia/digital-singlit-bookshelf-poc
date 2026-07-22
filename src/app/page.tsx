import Link from "next/link";

export default function Home() {
  return <main className="shell-page">
    <section className="shell-panel" aria-labelledby="shell-title">
      <p className="eyebrow">DIGITAL LIBRARY PROTOTYPE</p>
      <h1 id="shell-title">Digital SingLit Bookshelf PoC</h1>
      <p className="shell-introduction">Choose a space to enter.</p>
      <div className="shell-options" aria-label="Available spaces">
        <Link className="shell-option" href="/collection" prefetch={false}>
          <span className="shell-option-number">01</span>
          <strong>Enter the SingLit Collection</strong>
          <small>Explore Singapore literature across four languages.</small>
          <span className="shell-option-arrow" aria-hidden="true">→</span>
        </Link>
        <Link className="shell-option" href="/my-library" prefetch={false}>
          <span className="shell-option-number">02</span>
          <strong>Enter My Library</strong>
          <small>Curate a personal collection and reading space.</small>
          <span className="shell-option-arrow" aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  </main>;
}

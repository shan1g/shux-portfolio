export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div className="site-footer__brand">
          <p className="site-footer__mark">SHUX</p>
          <p className="site-footer__tagline">
            Interaction design and front-end craft, from South Africa.
          </p>
        </div>
      </div>

      <div className="container site-footer__base">
        <p>&copy; {new Date().getFullYear()} Shan Gray</p>
        <p>Built with Next.js, GSAP, and WebGPU</p>
      </div>
    </footer>
  );
}

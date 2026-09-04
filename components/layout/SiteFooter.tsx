import { navItems, siteLinks } from "@/lib/projects";

const socials = [
  { label: "GitHub", href: siteLinks.github },
  { label: "Behance", href: siteLinks.behance },
  { label: "LinkedIn", href: siteLinks.linkedin },
  { label: "X", href: siteLinks.x },
];

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

        <nav className="site-footer__group" aria-label="Footer navigation">
          <p className="site-footer__group-label">Index</p>
          <ul className="site-footer__list">
            {navItems.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="site-footer__link">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-footer__group">
          <p className="site-footer__group-label">Elsewhere</p>
          <ul className="site-footer__list">
            {socials.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-footer__link"
                >
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="container site-footer__base">
        <p>&copy; {new Date().getFullYear()} Shan Gray</p>
        <p>Built with Next.js, GSAP, and WebGPU</p>
      </div>
    </footer>
  );
}

// D22: footer con links de contacto (contenido adaptado del ejemplo Tailwind al sistema D14, sin deps)
const GITHUB_URL = "https://github.com/Pichuelectrico";
const LINKEDIN_URL = "https://www.linkedin.com/in/joshua-reinoso-cevallos-0b9b85286/";
const PORTFOLIO_URL = "https://portafolio-josh-reino.vercel.app/";

// Icono de enlace externo (lucide, inline)
const ExternalIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="ext-icon"
    aria-hidden="true"
  >
    <path d="M15 3h6v6"></path>
    <path d="M10 14 21 3"></path>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
  </svg>
);

// Icono de LinkedIn (lucide, inline)
const LinkedInIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect width="4" height="12" x="2" y="9"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
);

// Icono de GitHub (lucide, inline)
export const GitHubIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
    <path d="M9 18c-4.51 2-5-2-7-2"></path>
  </svg>
);

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-copyright">© 2026 Joshua Reinoso.</div>
      <div className="footer-links">
        <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="footer-link">
          <LinkedInIcon />
          <span>Connect with Josh on LinkedIn</span>
          <ExternalIcon />
        </a>
        <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" className="footer-link">
          <span className="footer-emoji" aria-hidden="true">👾</span>
          <span>Ver portafolio de Josh</span>
          <ExternalIcon />
        </a>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="footer-link">
          <GitHubIcon />
          <span>Go to Josh's GitHub</span>
          <ExternalIcon />
        </a>
      </div>
      <div className="footer-made">Made by a Dragon 🐉❤️</div>
    </footer>
  );
}

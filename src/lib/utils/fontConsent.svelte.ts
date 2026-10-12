// GDPR-compliant gating for third-party font CDNs (Adobe Fonts/Typekit,
// Google Fonts). Both transmit the visitor's IP address to a US-based
// server just by loading the stylesheet/font file, so per Art. 6(1)(a)
// GDPR we only request them after explicit opt-in — never on page load.
// Self-hosted fonts (Sligoil, served from our own /fonts/ path) are
// unaffected and always load normally.

export type FontConsentChoice = 'accepted' | 'declined';

const STORAGE_KEY = 'font-consent';

export function getStoredConsent(): FontConsentChoice | null {
	if (typeof localStorage === 'undefined') return null;
	const value = localStorage.getItem(STORAGE_KEY);
	return value === 'accepted' || value === 'declined' ? value : null;
}

export function setStoredConsent(choice: FontConsentChoice) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, choice);
}

// Shared across the banner (which reads/writes it) and anything else (e.g.
// a footer link) that wants to let the visitor reopen the choice later.
export const consentUi = $state({ visible: false });

let injected = false;

/**
 * Injects the third-party font stylesheets into <head>. Only call this
 * after the visitor has explicitly accepted — never unconditionally.
 */
export function loadThirdPartyFonts() {
	if (injected || typeof document === 'undefined') return;
	injected = true;

	const preconnect = (href: string) => {
		const link = document.createElement('link');
		link.rel = 'preconnect';
		link.href = href;
		link.crossOrigin = 'anonymous';
		document.head.appendChild(link);
	};

	// Adobe Fonts / Typekit — used for the 'area-inktrap' heading typeface.
	preconnect('https://use.typekit.net');
	preconnect('https://p.typekit.net');
	const typekit = document.createElement('link');
	typekit.rel = 'stylesheet';
	typekit.href = 'https://use.typekit.net/rrn1wdp.css';
	document.head.appendChild(typekit);

	// Google Fonts — 'Caveat', used for the handwritten text on the archive cards.
	preconnect('https://fonts.googleapis.com');
	preconnect('https://fonts.gstatic.com');
	const google = document.createElement('link');
	google.rel = 'stylesheet';
	google.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap';
	document.head.appendChild(google);
}

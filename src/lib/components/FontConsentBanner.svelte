<script lang="ts">
	import { base } from '$app/paths';
	import {
		getStoredConsent,
		setStoredConsent,
		loadThirdPartyFonts,
		consentUi,
		type FontConsentChoice
	} from '$lib/utils/fontConsent.svelte';

	$effect(() => {
		const stored = getStoredConsent();
		if (stored === 'accepted') {
			loadThirdPartyFonts();
		} else if (stored === null) {
			consentUi.visible = true;
		}
	});

	function choose(choice: FontConsentChoice) {
		setStoredConsent(choice);
		if (choice === 'accepted') loadThirdPartyFonts();
		consentUi.visible = false;
	}
</script>

{#if consentUi.visible}
	<div class="consent-overlay" role="dialog" aria-modal="true" aria-label="Font consent">
		<div class="consent-box">
			<p class="consent-text">
				This site loads custom typefaces from Adobe Fonts and Google Fonts. Loading them
				transmits your IP address to servers in the US. We only load them if you agree — if
				you decline, the site still works, just with your system's default font instead.
			</p>
			<p class="consent-link">
				<a href="{base}/privacy">privacy policy</a>
			</p>
			<div class="consent-actions">
				<button type="button" class="consent-btn consent-btn-decline" onclick={() => choose('declined')}>
					necessary only
				</button>
				<button type="button" class="consent-btn consent-btn-accept" onclick={() => choose('accepted')}>
					accept
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.consent-overlay {
		position: fixed;
		inset: 0;
		z-index: 2000;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding: 1.5rem;
		padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
		background: rgba(0, 0, 0, 0.35);
		backdrop-filter: blur(2px);
	}

	.consent-box {
		width: 100%;
		max-width: 32rem;
		background: #fff;
		border-radius: 0.75rem;
		padding: 1.25rem 1.5rem;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
	}

	.consent-text {
		font-size: 0.85rem;
		line-height: 1.5;
		color: #1a1a1a;
		margin: 0;
	}

	.consent-link {
		margin: 0.5rem 0 0;
	}

	.consent-link a {
		font-size: 0.8rem;
		color: #666;
		text-decoration: underline;
	}

	.consent-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1rem;
		flex-wrap: wrap;
	}

	.consent-btn {
		flex: 1;
		min-width: 9rem;
		padding: 0.6rem 1rem;
		border-radius: 9999px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		border: 1.5px solid #1a1a1a;
		transition: opacity 0.2s;
	}

	.consent-btn:hover {
		opacity: 0.75;
	}

	.consent-btn-decline {
		background: #fff;
		color: #1a1a1a;
	}

	.consent-btn-accept {
		background: #1a1a1a;
		color: #fff;
	}
</style>

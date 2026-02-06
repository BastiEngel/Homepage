<script lang="ts">
	import { getConfig } from '$lib/utils/theme';
	import { scrollReveal } from '$lib/utils/scrollAnimation';

	const config = getConfig();

	let name = $state('');
	let email = $state('');
	let message = $state('');
	let status = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		status = 'sending';

		const subject = encodeURIComponent(`Message from ${name}`);
		const body = encodeURIComponent(`From: ${name} (${email})\n\n${message}`);
		window.location.href = `mailto:${config.meta.email}?subject=${subject}&body=${body}`;

		status = 'sent';
		setTimeout(() => {
			status = 'idle';
		}, 3000);
	}
</script>

<section id="contact" class="relative px-6 py-16 md:px-12 lg:py-24">
	<div class="mx-auto max-w-2xl" use:scrollReveal>
		<h2 class="font-heading text-text text-center text-2xl font-bold sm:text-3xl lg:text-4xl">
			Get in Touch
		</h2>
		<p class="text-text-muted mt-3 text-center text-base">
			Have a project in mind? Let's talk.
		</p>

		<form onsubmit={handleSubmit} class="mt-10 space-y-5">
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
				<div>
					<label for="name" class="text-text mb-1.5 block text-sm font-medium">Name</label>
					<input
						id="name"
						type="text"
						bind:value={name}
						required
						class="form-input"
						placeholder="Your name"
					/>
				</div>
				<div>
					<label for="email" class="text-text mb-1.5 block text-sm font-medium">Email</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						class="form-input"
						placeholder="you@example.com"
					/>
				</div>
			</div>

			<div>
				<label for="message" class="text-text mb-1.5 block text-sm font-medium">Message</label>
				<textarea
					id="message"
					bind:value={message}
					required
					rows="5"
					class="form-input resize-none"
					placeholder="Tell me about your project..."
				></textarea>
			</div>

			<div class="text-center">
				<button
					type="submit"
					disabled={status === 'sending'}
					class="btn-submit"
				>
					{#if status === 'sent'}
						Sent!
					{:else if status === 'sending'}
						Sending...
					{:else}
						Send Message
					{/if}
				</button>
			</div>
		</form>
	</div>
</section>

<style>
	.form-input {
		width: 100%;
		padding: 10px 14px;
		border-radius: 10px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: 15px;
		font-family: var(--font-body);
		transition: border-color 0.2s, box-shadow 0.2s;
		outline: none;
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.06);
	}

	.form-input::placeholder {
		color: var(--color-text-muted);
	}

	.form-input:focus {
		border-color: var(--color-line);
		box-shadow: 0 0 0 3px rgba(114, 107, 255, 0.15);
	}

	.btn-submit {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 12px 32px;
		border-radius: 10px;
		border: none;
		background: var(--color-line);
		color: #fff;
		font-size: 15px;
		font-weight: 600;
		font-family: var(--font-body);
		cursor: pointer;
		transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
	}

	.btn-submit:hover {
		background: var(--color-primary-hover);
		box-shadow: 0 4px 14px rgba(114, 107, 255, 0.3);
		transform: translateY(-1px);
	}

	.btn-submit:active {
		transform: translateY(0);
	}

	.btn-submit:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>

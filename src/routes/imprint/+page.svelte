<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<Nav />

<main class="relative z-[6] mx-auto max-w-3xl px-6 mt-16 py-12 md:px-12">
	<h1 class="font-heading text-text mb-8 text-2xl font-bold">imprint</h1>

	<div class="text-text space-y-6 text-sm">
		<section>
			<h2 class="mb-2 text-base font-bold">information according to § 5 TMG</h2>
			<p>Bastian Engel</p>
			<p>Product Designer</p>
		</section>

		<section>
			<h2 class="mb-2 text-base font-bold">contact</h2>
			<p>Email available on request.</p>
		</section>

		<section>
			<h2 class="mb-2 text-base font-bold">responsible for content according to § 55 abs. 2 RStV</h2>
			<p>Bastian Engel</p>
		</section>

		<section>
			<h2 class="mb-2 text-base font-bold">liability for content</h2>
			<p>As a service provider, we are responsible for our own content on these pages in accordance with general legislation pursuant to Section 7 (1) TMG. However, according to Sections 8 to 10 TMG, we are not obliged as a service provider to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.</p>
			<p class="mt-2">Obligations to remove or block the use of information under general law remain unaffected. However, liability in this respect is only possible from the point in time at which we become aware of a specific infringement. If we become aware of any such infringements, we will remove this content immediately.</p>
		</section>

		<section>
			<h2 class="mb-2 text-base font-bold">liability for links</h2>
			<p>Our website contains links to external third-party websites over whose content we have no influence. Therefore, we cannot accept any liability for this third-party content. The respective provider or operator of the pages is always responsible for the content of the linked pages. The linked pages were checked for possible legal violations at the time of linking. Illegal content was not recognizable at the time of linking.</p>
			<p class="mt-2">However, permanent monitoring of the content of the linked pages is not reasonable without concrete evidence of a legal violation. If we become aware of any infringements, we will remove such links immediately.</p>
		</section>

		<section>
			<h2 class="mb-2 text-base font-bold">copyright</h2>
			<p>The content and works created by the site operators on these pages are subject to German copyright law. The reproduction, editing, distribution and any kind of use outside the limits of copyright law require the written consent of the respective author or creator. Downloads and copies of this site are only permitted for private, non-commercial use.</p>
			<p class="mt-2">Insofar as the content on this site was not created by the operator, the copyrights of third parties are respected. In particular, third-party content is identified as such. Should you nevertheless become aware of a copyright infringement, please inform us accordingly. If we become aware of any infringements, we will remove such content immediately.</p>
		</section>
	</div>
</main>

<Footer />

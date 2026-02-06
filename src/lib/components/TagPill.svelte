<script lang="ts">
	interface Props {
		label: string;
	}

	let { label }: Props = $props();
</script>

<span
	class="bg-tag-bg text-tag-text border-tag-border inline-block rounded-full border px-3 py-1 text-xs"
>
	{label}
</span>

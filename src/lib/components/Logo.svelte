<script lang="ts">
	let { size = 24 }: { size?: number } = $props();
</script>

<svg class="logo" width={size} height={size} viewBox="200 140 624 750" aria-hidden="true" focusable="false">
	<path d="M512 150 L812 250 L812 520 C812 700 680 820 512 880 C344 820 212 700 212 520 L212 250 Z" fill="var(--accent)" />
	<path d="M512 205 L760 288 L760 520 C760 668 654 770 512 823 C370 770 264 668 264 520 L264 288 Z" fill="var(--card, #1b2028)" />
	<g fill="var(--accent)">
		<circle cx="372" cy="380" r="34" />
		<rect x="430" y="356" width="232" height="48" rx="24" />
		<circle cx="372" cy="510" r="34" />
		<rect x="430" y="486" width="190" height="48" rx="24" />
	</g>
	<g fill="var(--accent)" fill-opacity="0.4">
		<circle cx="398" cy="640" r="30" />
		<rect x="450" y="618" width="130" height="44" rx="22" />
	</g>
	<path d="M356 381 L368 394 L390 368" fill="none" stroke="var(--card, #1b2028)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
</svg>

<style>
	.logo { display: block; flex: none; }
</style>

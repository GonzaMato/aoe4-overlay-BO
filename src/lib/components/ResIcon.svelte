<script lang="ts">
	import { RES_LABEL, type Resource } from '$lib/types';

	interface Props {
		res: Resource;
		size?: number;
		/** true cuando el ícono va sin texto al lado y tiene que anunciarse solo. */
		labelled?: boolean;
	}
	let { res, size = 16, labelled = false }: Props = $props();

	const COLOR: Record<Resource, string> = {
		food: '#E0705A',
		wood: '#6FBF73',
		gold: '#F2C84B',
		stone: '#AEB6C2'
	};
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 16 16"
	fill="none"
	stroke={COLOR[res]}
	stroke-width="1.6"
	stroke-linecap="round"
	stroke-linejoin="round"
	role={labelled ? 'img' : undefined}
	aria-label={labelled ? RES_LABEL[res] : undefined}
	aria-hidden={labelled ? undefined : 'true'}
>
	{#if res === 'food'}
		<circle cx="8" cy="9.5" r="5" />
		<path d="M8 4.5V2.5" />
		<path d="M8 4c1-1.5 2.5-2 4-1.5" />
	{:else if res === 'wood'}
		<path d="M8 1.5 13 9H3z" />
		<path d="M8 9v5.5" />
	{:else if res === 'gold'}
		<circle cx="8" cy="8" r="6" />
		<circle cx="8" cy="8" r="2.5" />
	{:else}
		<path d="M3 12.5 2 8l3.5-4.5h5L14 8l-1 4.5z" />
	{/if}
</svg>

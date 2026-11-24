<script lang="ts">
	import { t, locale, label as translateLabel } from '#lib/i18n.ts';
	interface Props {
		items: string[];
		label: string;
		placeholder?: string;
	}
	let { items = $bindable(), label, placeholder }: Props = $props();

	let draft = $state('');

	function add() {
		const value = draft.trim();
		if (value && !items.includes(value)) items.push(value);
		draft = '';
	}
</script>

<div class="list">
	<div class="chips">
		{#each items as item, i (item)}
			<span class="chip">
				{translateLabel(item, $locale)}
				<button type="button" aria-label={$t(`Quitar ${translateLabel(item, $locale)}`, `Remove ${translateLabel(item, $locale)}`)} onclick={() => items.splice(i, 1)}>
					<svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
						<path d="M2 2l6 6M8 2l-6 6" />
					</svg>
				</button>
			</span>
		{/each}
	</div>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			add();
		}}
	>
		<input aria-label={label} bind:value={draft} placeholder={placeholder ?? $t('Agregar…', 'Add…')} />
		<button type="submit" class="add">{$t("Agregar", "Add")}</button>
	</form>
</div>

<style>
	.list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 3px 4px 3px 10px;
		border: 1px solid var(--line-strong);
		border-radius: 14px;
		background: var(--card);
		font-size: 13px;
	}
	.chip button {
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--dim);
		cursor: pointer;
	}
	.chip button:hover {
		background: var(--line-strong);
		color: var(--text);
	}
	form {
		display: flex;
		gap: 8px;
	}
	input {
		flex: 1;
		max-width: 280px;
		height: 32px;
		padding: 0 10px;
		border: 1px solid var(--line-strong);
		border-radius: 6px;
		background: var(--bg);
	}
	.add {
		height: 32px;
		padding: 0 12px;
		border: 1px solid var(--line-strong);
		border-radius: 6px;
		background: var(--card);
		cursor: pointer;
	}
	.add:hover {
		border-color: var(--dim);
	}
</style>

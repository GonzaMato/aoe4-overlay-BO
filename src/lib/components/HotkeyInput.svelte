<script lang="ts">
	import { t, locale } from '$lib/i18n';
	import { send } from '$lib/bridge';
	import { eventToHotkey, prettyHotkey } from '$lib/hotkeys';

	interface Props {
		value: string;
		id?: string;
	}
	let { value = $bindable(), id }: Props = $props();

	let capturing = $state(false);
	let capturedAt = 0;

	// Mientras se captura, el overlay suelta sus teclas globales: si no, Windows se queda
	// con la combinación y esta ventana nunca la recibe.
	function start() {
		capturing = true;
		void send('hotkeys-suspend', true);
	}

	function stop() {
		if (!capturing) return;
		capturing = false;
		void send('hotkeys-suspend', false);
	}

	function onClick() {
		if (Date.now() - capturedAt < 400) return;
		if (capturing) stop();
		else start();
	}

	function onKeydown(e: KeyboardEvent) {
		if (!capturing) return;
		e.preventDefault();
		e.stopPropagation();
		if (e.code === 'Escape') {
			stop();
			return;
		}
		const combo = eventToHotkey(e);
		if (!combo) return;
		value = combo;
		capturedAt = Date.now();
		stop();
	}
</script>

<button {id} type="button" class:capturing onclick={onClick} onkeydown={onKeydown} onblur={stop}>
	{capturing ? $t("Presioná la combinación… (Esc cancela)", "Press the shortcut… (Esc to cancel)") : prettyHotkey(value, $locale)}
</button>

<style>
	button {
		min-width: 190px;
		height: 32px;
		padding: 0 12px;
		border: 1px solid var(--line-strong);
		border-radius: 6px;
		background: var(--bg);
		text-align: left;
		cursor: pointer;
	}
	button:hover {
		border-color: var(--dim);
	}
	button.capturing {
		border-color: var(--accent);
		color: var(--accent);
	}
</style>

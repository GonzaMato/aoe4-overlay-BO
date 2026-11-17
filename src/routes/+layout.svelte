<script lang="ts">
	import '../app.css';
	import { locale } from '$lib/i18n';
	$effect(() => { document.documentElement.lang = $locale; });

	let { children } = $props();
</script>

{@render children()}

<script lang="ts">
	import { searchUsers } from '$lib/api/chat';
	import { createEventDispatcher } from 'svelte';

	interface Props {
		selected: string[];
		exclude?: string[];
		loading?: boolean;
		placeholderEmpty?: string;
		placeholderWithSelection?: string;
	}

	let {
		selected,
		exclude = [],
		loading = false,
		placeholderEmpty = 'e.g. charlie or cha',
		placeholderWithSelection = 'Add another…',
	}: Props = $props();

	let searchQuery = $state('');
	let searchResults = $state<{ id: number; username: string; email: string }[]>([]);
	let searchDebounce: ReturnType<typeof setTimeout> | null = null;
	const dispatch = createEventDispatcher<{ change: string[] }>();

	function emitSelected(next: string[]) {
		selected = next;
		dispatch('change', next);
	}

	function runSearch() {
		const q = searchQuery.trim();
		if (!q) {
			searchResults = [];
			return;
		}
		searchUsers(q, 15)
			.then((list) => {
				if (searchQuery.trim() !== q) return;
				const arr = Array.isArray(list) ? list : [];
				const blocked = new Set<string>([...selected, ...exclude]);
				searchResults = arr.filter(
					(u) => u && typeof u.username === 'string' && !blocked.has(u.username),
				);
			})
			.catch(() => {
				if (searchQuery.trim() !== q) return;
				searchResults = [];
			});
	}

	function onSearchInput() {
		if (searchDebounce) clearTimeout(searchDebounce);
		searchDebounce = setTimeout(runSearch, 120);
	}

	function addUser(u: { username: string }) {
		if (!u?.username) return;
		if (selected.includes(u.username)) return;
		if (exclude.includes(u.username)) return;
		const next = [...selected, u.username];
		emitSelected(next);
		searchQuery = '';
		searchResults = [];
	}

	function removeUser(username: string) {
		const next = selected.filter((p) => p !== username);
		emitSelected(next);
	}
</script>

<div class="search-wrap">
	<div class="search-bar">
		{#each selected as name (name)}
			<span class="chip">
				{name}
				<button
					type="button"
					class="chip-remove"
					onclick={() => removeUser(name)}
					aria-label="Remove"
				>
					×
				</button>
			</span>
		{/each}
		<input
			type="text"
			bind:value={searchQuery}
			oninput={onSearchInput}
			placeholder={selected.length ? placeholderWithSelection : placeholderEmpty}
			disabled={loading}
			autocomplete="off"
			class="search-input"
		/>
	</div>
	{#if searchResults.length > 0}
		<ul class="search-dropdown" role="listbox">
			{#each searchResults as u (u.id)}
				<li role="option" aria-selected="false">
					<button type="button" onclick={() => addUser(u)}>
						<span class="username">{u.username}</span>
						{#if u.email}<span class="email">{u.email}</span>{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.search-wrap {
		position: relative;
		overflow: visible;
	}
	.search-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		min-height: 44px;
		padding: 6px 12px;
		background: var(--Background-Lift-8);
		border: 1px solid var(--Border-Subtle);
		border-radius: 8px;
	}
	.search-bar .search-input {
		flex: 1 1 120px;
		min-width: 120px;
		padding: 6px 0;
		margin: 0;
		border: none;
		background: transparent;
		outline: none;
		font-size: 14px;
		color: var(--Text-Heading-Strong);
	}
	.search-bar .search-input::placeholder {
		color: var(--Text-Heading-Medium);
	}
	.search-bar .chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		background: rgba(56, 189, 248, 0.25);
		border-radius: 6px;
		font-size: 13px;
		color: var(--Text-Heading-Strong);
	}
	.search-bar .chip-remove {
		padding: 0;
		margin: 0;
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		font-size: 16px;
		line-height: 1;
		opacity: 0.8;
	}
	.search-bar .chip-remove:hover {
		opacity: 1;
	}
	.search-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin: 0;
		padding: 4px 0;
		list-style: none;
		background: #1a1a1a;
		border: 1px solid var(--Border-Subtle);
		border-radius: 8px;
		max-height: 200px;
		overflow-y: auto;
		z-index: 10;
	}
	.search-dropdown button {
		width: 100%;
		padding: 8px 12px;
		text-align: left;
		background: none;
		border: none;
		color: var(--Text-Heading-Strong);
		cursor: pointer;
		font-size: 14px;
		display: block;
	}
	.search-dropdown button:hover {
		background: rgba(242, 242, 242, 0.08);
	}
	.search-dropdown .username {
		font-weight: 600;
		display: block;
	}
	.search-dropdown .email {
		font-size: 12px;
		color: var(--Text-Heading-Medium);
	}
</style>


<script lang="ts">
	import { page } from '$app/stores';
	import { admins, adminsMeta, chatName, participants, participantsMeta } from '$lib/stores/message';
	import { username } from '$lib/stores/auth';
	import {
		closeParticipantsPanel,
		openAddMemberPopup,
		showParticipantsPanel,
	} from '$lib/stores/nav';
	import { onDestroy } from 'svelte';
	import { kickMembers } from '$lib/api/chat';
	import { participantsCount } from '$lib/stores/message';

	let currentUser = $derived($username ?? '');
	let list = $derived(($participants ?? []).slice().sort((a, b) => a.localeCompare(b)));
	let isAdmin = $derived($admins.includes(currentUser));
	let actorId = $derived(
		($participantsMeta ?? []).find((p) => p.username === currentUser)?.id ??
			($adminsMeta ?? []).find((p) => p.username === currentUser)?.id ??
			null
	);
	let search = $state('');
	let filter = $state<'everyone' | 'admins' | 'members'>('everyone');
	let filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		return list.filter((p) => {
			const matchesFilter =
				filter === 'everyone'
					? true
					: filter === 'admins'
						? $admins.includes(p)
						: !$admins.includes(p);
			const matchesSearch = !q || p.toLowerCase().includes(q);
			return matchesFilter && matchesSearch;
		});
	});
	let chatId = $derived($page.params.chatId);

	let confirmKick = $state<string | null>(null);
	let kickLoading = $state<string | null>(null);
	let kickError = $state('');

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) closeParticipantsPanel();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeParticipantsPanel();
	}

	if (typeof window !== 'undefined') {
		window.addEventListener('keydown', onKeydown);
		onDestroy(() => window.removeEventListener('keydown', onKeydown));
	}

	function openKickConfirm(p: string) {
		kickError = '';
		confirmKick = p;
	}

	async function doKick(target: string) {
		if (!chatId) return;
		if (target === currentUser) return;
		if (!actorId) return;
		kickError = '';

		const targetId = ($participantsMeta ?? []).find((p) => p.username === target)?.id ?? null;
		if (!targetId) {
			kickError = 'Unable to identify participant.';
			return;
		}

		const nextParticipants = ($participants ?? []).filter((p) => p !== target);
		if (nextParticipants.length === 0) {
			kickError = 'Cannot remove all participants.';
			return;
		}
		const nextAdmins = ($admins ?? []).filter((a) => a !== target);

		kickLoading = target;
		try {
			await kickMembers(chatId, actorId, [targetId]);
			participants.set(nextParticipants);
			participantsCount.set(nextParticipants.length);
			admins.set(nextAdmins);
			confirmKick = null;
		} catch (err) {
			kickError = err instanceof Error ? err.message : 'Failed to remove participant';
		} finally {
			kickLoading = null;
		}
	}
</script>

{#if $showParticipantsPanel}
	<div
		class="overlay"
		role="dialog"
		aria-modal="true"
		aria-label="Participants"
		tabindex="-1"
		onclick={onBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && closeParticipantsPanel()}
	>
		<aside class="panel">
			<header class="header">
				<div class="title">
					<p class="name">{$chatName ?? 'Chat'}</p>
					<p class="subtitle">{list.length} participant{list.length === 1 ? '' : 's'}</p>
				</div>
				<button type="button" class="icon-btn" onclick={closeParticipantsPanel} aria-label="Close participants panel">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M18 6L6 18" />
						<path d="M6 6l12 12" />
					</svg>
				</button>
			</header>

			{#if isAdmin}
				<div class="admin-actions" role="group" aria-label="Member actions">
					<button type="button" class="action" onclick={openAddMemberPopup}>Add people</button>
				</div>
			{/if}

			<div class="search">
				<label class="sr-only" for="participants-search">Search participants</label>
				<div class="search-row">
					<input
						id="participants-search"
						type="text"
						bind:value={search}
						placeholder="Search people…"
						autocomplete="off"
					/>
					<label class="sr-only" for="participants-filter">Filter participants</label>
					<select id="participants-filter" bind:value={filter}>
						<option value="everyone">Everyone</option>
						<option value="admins">Admins</option>
						<option value="members">Members</option>
					</select>
				</div>
			</div>

			<ul class="list" aria-label="Participant list">
				{#each filtered as p (p)}
					{@const admin = $admins.includes(p)}
					{@const self = p === currentUser}
					<li class="row">
						<span class="avatar" aria-hidden="true">
							{p.slice(0, 1).toUpperCase()}
						</span>
						<span class="label">
							<span class="username">{p}{self ? ' (you)' : ''}</span>
							{#if admin}
								<span class="badge">Admin</span>
							{/if}
						</span>
						{#if isAdmin && !self}
							<button
								type="button"
								class="kick"
								aria-label={"Remove " + p}
								disabled={kickLoading !== null && kickLoading !== p}
								onclick={() => openKickConfirm(p)}
							>
								Remove
							</button>
						{/if}
					</li>
					{#if confirmKick === p}
						<li class="confirm-row" aria-label={"Confirm remove " + p}>
							<span class="confirm-text">Remove {p} from this chat?</span>
							<div class="confirm-actions">
								<button type="button" class="confirm-btn" onclick={() => (confirmKick = null)} disabled={kickLoading === p}>
									Cancel
								</button>
								<button type="button" class="confirm-btn danger" onclick={() => doKick(p)} disabled={kickLoading === p}>
									{kickLoading === p ? 'Removing…' : 'Remove'}
								</button>
							</div>
						</li>
					{/if}
				{/each}
			</ul>

			{#if filtered.length === 0}
				<p class="empty">No participants match “{search.trim()}”.</p>
			{/if}
			{#if kickError}
				<p class="error" role="status" aria-live="polite">{kickError}</p>
			{/if}
		</aside>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.32);
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 18px;
		z-index: 70;
	}
	.panel {
		width: min(420px, 92vw);
		max-height: min(72vh, 720px);
		background: rgba(15, 23, 42, 1);
		border: 1px solid var(--Border-Subtle);
		border-radius: 12px;
		padding: 10px;
		box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
		display: flex;
		flex-direction: column;
		gap: 10px;
		overflow: hidden;
	}
	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}
	.title {
		min-width: 0;
	}
	.name {
		margin: 0;
		font-weight: 700;
		color: var(--Text-Heading-Strong);
		letter-spacing: 0.02em;
		font-size: 15px;
	}
	.subtitle {
		margin: 2px 0 0 0;
		color: var(--Text-Heading-Medium);
		font-size: 12px;
	}
	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 6px;
		border-radius: 8px;
		background: transparent;
		border: 1px solid var(--Border-Subtle);
		color: var(--Text-Heading-Strong);
		cursor: pointer;
	}
	.icon-btn:hover {
		color: var(--accent-glow);
	}
	.admin-actions {
		display: flex;
		gap: 8px;
	}
	.action {
		flex: 1;
		padding: 8px 10px;
		background: transparent;
		border: 1px solid var(--Border-Subtle);
		border-radius: 8px;
		color: var(--Text-Heading-Strong);
		cursor: pointer;
		font-size: 12px;
	}
	.action:hover {
		color: var(--accent-glow);
	}
	.search input {
		flex: 1;
		padding: 9px 10px;
		background: rgba(242, 242, 242, 0.06);
		border: 1px solid var(--Border-Subtle);
		border-radius: 10px;
		color: var(--Text-Heading-Strong);
		font-size: 13px;
	}
	.search-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.search select {
		min-width: 132px;
		padding: 8px 28px 8px 12px;
		background: rgba(242, 242, 242, 0.06);
		border: 1px solid var(--Border-Subtle);
		border-radius: 999px;
		color: var(--Text-Heading-Strong);
		font-size: 13px;
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
		background-image:
			linear-gradient(45deg, transparent 50%, currentColor 50%),
			linear-gradient(135deg, currentColor 50%, transparent 50%);
		background-position:
			calc(100% - 18px) 50%,
			calc(100% - 13px) 50%;
		background-size: 5px 5px, 5px 5px;
		background-repeat: no-repeat;
		cursor: pointer;
		transition: color 120ms ease-out, border-color 120ms ease-out, background-color 120ms ease-out;
	}
	.search select:hover {
		color: var(--accent-glow);
		background-color: rgba(242, 242, 242, 0.08);
	}
	.search select option {
		background: #1a1a1a;
		color: var(--Text-Heading-Strong);
	}
	.search input::placeholder {
		color: var(--Text-Heading-Medium);
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-height: 0;
		overflow: auto;
		flex: 1;
	}
	.empty {
		margin: 0;
		color: var(--Text-Heading-Medium);
		font-size: 13px;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 10px;
		border: 1px solid var(--Border-Subtle);
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.02);
	}
	.kick {
		margin-left: auto;
		padding: 7px 9px;
		border-radius: 8px;
		border: 1px solid var(--Border-Subtle);
		background: rgba(251, 113, 133, 0.08);
		color: #fb7185;
		cursor: pointer;
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
	}
	.kick:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.confirm-row {
		margin-top: -6px;
		padding: 9px 10px;
		border: 1px solid var(--Border-Subtle);
		border-radius: 10px;
		background: rgba(0, 0, 0, 0.18);
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.confirm-text {
		color: var(--Text-Heading-Medium);
		font-size: 13px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.confirm-actions {
		margin-left: auto;
		display: flex;
		gap: 8px;
	}
	.confirm-btn {
		padding: 7px 9px;
		border-radius: 8px;
		border: 1px solid var(--Border-Subtle);
		background: transparent;
		color: var(--Text-Heading-Strong);
		cursor: pointer;
		font-size: 12px;
	}
	.confirm-btn.danger {
		background: #dc2626;
		border-color: #dc2626;
		color: #fff;
	}
	.error {
		margin: 0;
		color: #f87171;
		font-size: 13px;
	}
	.avatar {
		width: 32px;
		height: 32px;
		border-radius: 10px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 750;
		background: rgba(56, 189, 248, 0.16);
		color: var(--accent-glow);
		flex-shrink: 0;
	}
	.label {
		min-width: 0;
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.username {
		color: var(--Text-Heading-Strong);
		font-weight: 650;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.badge {
		font-size: 11px;
		padding: 3px 8px;
		border-radius: 999px;
		border: 1px solid var(--Border-Subtle);
		color: var(--Text-Heading-Medium);
	}
	@media (max-width: 768px) {
		.overlay {
			align-items: center;
			padding: 10px 8px;
		}
		.panel {
			width: min(100vw - 16px, 420px);
			max-height: calc(100vh - 32px);
			padding: 10px;
		}
	}
</style>


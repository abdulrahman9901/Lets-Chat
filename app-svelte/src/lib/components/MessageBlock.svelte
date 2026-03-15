<script lang="ts">
	import { API_BASE_URL } from '$lib/config';
	import { formatMessageTimestamp } from '$lib/utils/format';
	import type { ChatMessage } from '$lib/stores/message';

	type Block =
		| { type: 'system'; msg: ChatMessage }
		| { type: 'single'; msg: ChatMessage }
		| { type: 'imageGroup'; messages: ChatMessage[] };

	interface Props {
		block: Block;
		currentUser: string;
		participants: string[];
		participantsCount: number;
		onOpenImage: (url: string, path: string) => void;
		onOpenImageGroup: (messages: ChatMessage[]) => void;
	}
	let { block, currentUser, participants, participantsCount, onOpenImage, onOpenImageGroup }: Props = $props();
</script>

{#if block.type === 'system'}
	<li class="sys"><p class="sys">{block.msg.content}</p></li>
{:else if block.type === 'single'}
	{@const msg = block.msg}
	{@const isSelf = currentUser === msg.author}
	{@const inChat = participants.includes(msg.author)}
	<li class={inChat ? (isSelf ? 'sent' : 'replies') : 'replies out'}>
		{#if participantsCount >= 0}
			<small class={inChat ? (isSelf ? 'sender' : 'reciever') : 'out'}>{msg.author}</small>
		{/if}
		<br />
		{#if msg.content == null && msg.image}
			<button
				type="button"
				class="messageImage-wrap"
				onclick={() => onOpenImage(`${API_BASE_URL}/media/${msg.image}`, msg.image ?? '')}
			>
				<img
					src="{API_BASE_URL}/media/{msg.image}"
					alt="Chat image"
					class="messageImage {inChat ? (isSelf ? 'imgsent' : 'imgrecv') : 'imgout'}"
				/>
			</button>
		{:else}
			<p>{msg.content ?? ''}</p>
		{/if}
		<br />
		<small class="timestamp">{formatMessageTimestamp(msg.timestamp)}</small>
	</li>
{:else}
	{@const group = block.messages}
	{@const isSelf = currentUser === group[0].author}
	{@const inChat = participants.includes(group[0].author)}
	{@const displayCount = Math.min(4, group.length)}
	{@const extraCount = group.length > 4 ? group.length - 4 : 0}
	<li class={inChat ? (isSelf ? 'sent' : 'replies') : 'replies out'}>
		{#if participantsCount >= 0}
			<small class={inChat ? (isSelf ? 'sender' : 'reciever') : 'out'}>{group[0].author}</small>
		{/if}
		<br />
		<button
			type="button"
			class="image-group image-group-{displayCount} {inChat ? (isSelf ? 'imgsent' : 'imgrecv') : 'imgout'}"
			onclick={() => onOpenImageGroup(group)}
		>
			{#each group.slice(0, 4) as msg, idx}
				<span class="image-group-cell">
					<img src="{API_BASE_URL}/media/{msg.image}" alt="" />
					{#if idx === 3 && extraCount > 0}
						<span class="image-group-more">+{extraCount}</span>
					{/if}
				</span>
			{/each}
		</button>
		<br />
		<small class="timestamp">{formatMessageTimestamp(group[group.length - 1].timestamp)}</small>
	</li>
{/if}

<style>
	li.sys {
		text-align: center;
		color: var(--Text-Heading-Medium);
		margin: 8px 0;
	}
	li.sent {
		text-align: right;
		margin: 8px 0;
	}
	li.replies {
		text-align: left;
		margin: 8px 0;
	}
	li.sent .image-group {
		margin-left: auto;
	}
	.sender,
	.reciever {
		font-size: 12px;
		color: var(--Text-Heading-Medium);
	}
	.timestamp {
		font-size: 11px;
		color: var(--Text-Heading-Medium);
	}
	.messageImage-wrap {
		display: inline-block;
		padding: 0;
		margin: 0;
		border: none;
		background: none;
		cursor: pointer;
		border-radius: 8px;
	}
	.messageImage {
		max-width: 200px;
		max-height: 200px;
		object-fit: cover;
		border-radius: 8px;
		display: block;
		vertical-align: middle;
	}
	.messageImage-wrap:hover .messageImage {
		opacity: 0.9;
	}
	.image-group {
		display: grid;
		gap: 3px;
		max-width: 320px;
		border-radius: 12px;
		overflow: hidden;
		padding: 0;
		margin: 0;
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
	}
	.image-group-2 {
		grid-template-columns: 1fr 1fr;
	}
	.image-group-3 {
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr 1fr;
	}
	.image-group-3 .image-group-cell:first-child {
		grid-row: span 2;
	}
	.image-group-4 {
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr 1fr;
	}
	.image-group-cell {
		position: relative;
		display: block;
		padding: 0;
		margin: 0;
		border: none;
		background: var(--Border-Subtle);
		cursor: pointer;
		aspect-ratio: 1;
		overflow: hidden;
		min-width: 0;
		min-height: 0;
	}
	.image-group-cell img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		vertical-align: middle;
	}
	.image-group-cell:hover img {
		opacity: 0.92;
	}
	.image-group-more {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.55);
		color: #fff;
		font-size: 24px;
		font-weight: 700;
	}
</style>

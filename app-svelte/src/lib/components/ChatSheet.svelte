<script lang="ts">
	interface Props {
		convoStarters?: string[];
		onClose?: () => void;
		onStarter?: (text: string) => void;
		onSend?: (text: string) => void;
	}

	let {
		convoStarters = [
			'How can I open business account?',
			'How can I open business account?',
			'Business banking options'
		],
		onClose,
		onStarter,
		onSend
	}: Props = $props();

	let input = $state('');
</script>

<div class="ai-chat">
	<div class="sheet">
		<div class="toolbar">
			<div class="title-and-controls">
				<button
					type="button"
					class="btn-circle"
					aria-label="Close"
					onclick={onClose}
				>
					<svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M12 4L4 12M4 4l8 8" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>
			</div>
		</div>

		<div class="copy">
			<div class="container">
				<div class="avatar-wrap">
					<div class="avatar-glow" aria-hidden="true"></div>
					<img class="avatar-img" src="https://placehold.co/80x80" alt="" width="80" height="80" />
				</div>
				<div class="copy-text">
					<h2 class="heading">Hi, there!</h2>
					<p class="subheading">How can I help you today?</p>
				</div>
			</div>
			<div class="search-and-starters">
				<div class="convo-starters">
					{#each convoStarters as starter}
						<button
							type="button"
							class="btn-starter"
							onclick={() => onStarter?.(starter)}
						>
							{starter}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<div class="bottom">
			<form
				class="ai-search"
				onsubmit={(e) => {
					e.preventDefault();
					const t = input.trim();
					if (t) {
						onSend?.(t);
						input = '';
					}
				}}
			>
				<div class="input-row">
					<button type="button" class="btn-circle" aria-label="Add">
						<svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M8 3v10M3 8h10" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</button>
					<input
						type="text"
						class="input-field"
						placeholder="ask anything"
						bind:value={input}
						aria-label="Ask anything"
					/>
					<button type="button" class="btn-circle" aria-label="Microphone">
						<svg class="icon icon-mic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
							<rect x="5" y="1" width="6" height="9" rx="3" />
							<path d="M2 7v2a4 4 0 008 0V7M8 12v2" stroke-linecap="round" />
						</svg>
					</button>
					<button type="button" class="btn-circle" aria-label="Voice recording">
						<svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M2 4v8a6 6 0 0012 0V4" stroke-linecap="round" />
						</svg>
					</button>
				</div>
			</form>
		</div>
	</div>
</div>

<style>
	.ai-chat {
		width: 100%;
		height: 100%;
		min-height: 100vh;
		padding: 16px;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		backdrop-filter: blur(12px);
	}

	.sheet {
		flex: 1 1 0;
		max-width: 560px;
		min-height: 70vh;
		background: var(--Background-Lift-8);
		box-shadow:
			0 -1px 0 rgba(242, 242, 242, 0.08) inset,
			0 1px 0 rgba(242, 242, 242, 0.16) inset;
		border-radius: 24px;
		outline: 1px var(--Border-Subtle) solid;
		outline-offset: -0.5px;
		backdrop-filter: blur(20px);
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.toolbar {
		width: 100%;
		padding: 12px;
		border-radius: 24px;
	}

	.title-and-controls {
		display: flex;
		justify-content: flex-end;
		align-items: center;
	}

	.btn-circle {
		padding: 12px;
		background: var(--Button-Secondary-Default-Background-subtle);
		box-shadow:
			0 -1px 0 rgba(242, 242, 242, 0.08) inset,
			0 1px 0 rgba(242, 242, 242, 0.16) inset;
		border-radius: 12px;
		border: 1px solid var(--Button-Secondary-Default-Border);
		backdrop-filter: blur(20px);
		color: var(--Button-Secondary-Icon);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s, transform 0.15s;
	}
	.btn-circle:hover {
		background: rgba(242, 242, 242, 0.12);
	}
	.btn-circle:active {
		transform: scale(0.97);
	}

	.icon {
		width: 16px;
		height: 16px;
	}
	.icon-mic {
		width: 14px;
		height: 14px;
	}

	.copy {
		flex: 1 1 0;
		width: 100%;
		padding: 16px;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 48px;
		overflow: hidden;
	}

	.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 48px;
		padding: 0 32px;
	}

	.avatar-wrap {
		position: relative;
		width: 80px;
		height: 80px;
	}

	.avatar-glow {
		position: absolute;
		inset: -8px;
		border-radius: 50%;
		background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
		opacity: 0.6;
		filter: blur(12px);
		animation: pulse 2s ease-in-out infinite;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.5;
			transform: scale(1);
		}
		50% {
			opacity: 0.8;
			transform: scale(1.05);
		}
	}

	.avatar-img {
		position: relative;
		width: 80px;
		height: 80px;
		border-radius: 50%;
		object-fit: cover;
	}

	.copy-text {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.heading {
		margin: 0;
		color: var(--Text-Heading-Strong);
		font-size: 28px;
		font-weight: 500;
		line-height: 28px;
		text-align: center;
	}

	.subheading {
		margin: 0;
		color: var(--Text-Heading-Medium);
		font-size: 16px;
		font-weight: 500;
		line-height: 24px;
		text-align: center;
	}

	.search-and-starters {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 24px;
	}

	.convo-starters {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 12px;
	}

	.btn-starter {
		padding: 8px 20px;
		background: var(--Button-Secondary-Default-Background-subtle);
		box-shadow:
			0 -1px 0 rgba(242, 242, 242, 0.08) inset,
			0 1px 0 rgba(242, 242, 242, 0.16) inset;
		border-radius: 12px;
		border: 1px solid var(--Button-Secondary-Default-Border);
		backdrop-filter: blur(20px);
		color: var(--Button-Secondary-Default-Text);
		font-size: 14px;
		font-family: inherit;
		font-weight: 400;
		line-height: 20px;
		cursor: pointer;
		transition: background 0.2s, transform 0.15s;
	}
	.btn-starter:hover {
		background: rgba(242, 242, 242, 0.12);
	}
	.btn-starter:active {
		transform: scale(0.98);
	}

	.bottom {
		width: 100%;
		padding: 16px;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 24px;
	}

	.ai-search {
		width: 100%;
		background: var(--Background-Lift-8);
		border-radius: 24px;
		padding: 12px;
	}

	.input-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.input-field {
		flex: 1 1 0;
		min-width: 0;
		padding: 10px 12px;
		background: transparent;
		border: none;
		color: var(--Text-Heading-Strong);
		font-size: 16px;
		font-family: inherit;
		font-weight: 400;
		line-height: 24px;
		outline: none;
	}
	.input-field::placeholder {
		color: var(--Input-Default-Text);
	}
</style>

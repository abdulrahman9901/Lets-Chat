import { WS_BASE_URL } from '$lib/config';
import type { ChatMessage } from '$lib/stores/message';
import { logger } from '$lib/logger';

type MessagesCallback = (payload: {
	messages: ChatMessage[];
	participants: string[];
	name?: string;
	admins?: string[];
	system_message?: string;
	image?: string;
	chatKey?: string;
}) => void;

const callbacks: {
	messages?: MessagesCallback;
	new_message?: (message: ChatMessage) => void;
	chatsUpdate?: (username: string, token: string) => void;
} = {};

let socketRef: WebSocket | null = null;
let currentChatURL: string | null = null;
let reconnectIntent = false;
let reconnectAttempts = 0;

export function connect(chatURL: string | number | null | undefined): void {
	if (chatURL == null || chatURL === '' || String(chatURL) === 'undefined') return;
	const room = String(chatURL);
	if (socketRef?.readyState === WebSocket.OPEN && currentChatURL === room) return;
	if (socketRef && (socketRef.readyState === WebSocket.OPEN || socketRef.readyState === WebSocket.CONNECTING)) {
		reconnectIntent = true;
		socketRef.close();
		socketRef = null;
	}
	currentChatURL = room;
	reconnectIntent = false;
	const path = `${WS_BASE_URL}/ws/chat/${room}/`;
	logger.info('ws:connect', { url: path, room });
	socketRef = new WebSocket(path);

	socketRef.onopen = () => {
		reconnectAttempts = 0;
		logger.debug('ws:open', { url: path, room });
	};

	socketRef.onmessage = (e: MessageEvent) => {
		try {
			const parsed = JSON.parse(e.data);
			const cmd = parsed.command;
			if (cmd === 'messages') {
				callbacks.messages?.({
					messages: parsed.messages ?? [],
					participants: parsed.participants ?? [],
					name: parsed.name,
					admins: parsed.admins,
					system_message: parsed.system_message,
					image: parsed.image,
					chatKey: parsed.chatKey,
				});
			} else if (cmd === 'new_message') {
				callbacks.new_message?.(parsed.message);
			} else if (cmd === 'chatsUpdate') {
				const u = typeof localStorage !== 'undefined' ? localStorage.getItem('username') : '';
				const t = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '';
				callbacks.chatsUpdate?.(u ?? '', t ?? '');
			}
		} catch (_) {}
	};

	socketRef.onerror = (e) => {
		logger.error('ws:error', { url: path, room, error: String(e) });
	};
	socketRef.onclose = () => {
		const url = currentChatURL;
		socketRef = null;
		if (url && !reconnectIntent) {
			const delay = Math.min(2000 + reconnectAttempts * 1000, 10000);
			reconnectAttempts += 1;
			setTimeout(() => {
				reconnectAttempts = 0;
				connect(url);
			}, delay);
		}
	};
}

export function fetchMessages(username: string, chatId: string, msgCount = 50): void {
	send({ command: 'load_messages', username, chatId, msgCount });
}

export function newChatMessage(msg: { from: string; content: string; chatId: string }): void {
	send({ command: 'new_message', from: msg.from, message: msg.content, chatId: msg.chatId });
}

export function addCallbacks(
	messageCb: MessagesCallback,
	newMessageCb: (m: ChatMessage) => void,
	chatsUpdateCb: (u: string, t: string) => void
): void {
	callbacks.messages = messageCb;
	callbacks.new_message = newMessageCb;
	callbacks.chatsUpdate = chatsUpdateCb;
}

function send(data: Record<string, unknown>): void {
	try {
		socketRef?.send(JSON.stringify(data));
	} catch (_) {}
}

export function state(): number | null {
	return socketRef?.readyState ?? null;
}

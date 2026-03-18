import { WS_BASE_URL } from '$lib/config';
import type { ChatMessage } from '$lib/stores/message';
import { logger } from '$lib/logger';

type MessagesCallback = (payload: {
	messages: ChatMessage[];
	participants: string[];
	participantsMeta?: { id: number; username: string }[];
	name?: string;
	admins?: string[];
	adminsMeta?: { id: number; username: string }[];
	system_message?: string;
	image?: string;
	chatKey?: string;
	room_id?: string;
}) => void;

const callbacks: {
	messages?: MessagesCallback;
	new_message?: (message: ChatMessage) => void;
	chatsUpdate?: (username: string, token: string) => void;
} = {};

let socketRef: WebSocket | null = null;
let currentRoomId: string | null = null;
let reconnectAttempts = 0;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
const pendingQueue: Record<string, unknown>[] = [];

const SESSION_WS_PATH = `${WS_BASE_URL.replace(/^http/, 'ws')}/ws/chat/`;

function send(data: Record<string, unknown>): void {
	if (socketRef?.readyState === WebSocket.OPEN) {
		try {
			socketRef.send(JSON.stringify(data));
			return;
		} catch (_) {}
	}
	pendingQueue.push(data);
}

export function connect(roomId: string | number | null | undefined): void {
	if (roomId == null || roomId === '' || String(roomId) === 'undefined') return;
	const room = String(roomId);

	if (socketRef?.readyState === WebSocket.OPEN) {
		if (currentRoomId === room) return;
		if (currentRoomId) {
			send({ command: 'leave_room', room_id: currentRoomId, chatId: currentRoomId });
		}
		send({ command: 'join_room', room_id: room, chatId: room });
		currentRoomId = room;
		logger.debug('ws:subscribe', { room });
		return;
	}

	if (socketRef && socketRef.readyState === WebSocket.CONNECTING) {
		pendingQueue.push({ command: 'join_room', room_id: room, chatId: room });
		currentRoomId = room;
		return;
	}

	currentRoomId = room;
	pendingQueue.push({ command: 'join_room', room_id: room, chatId: room });
	logger.info('ws:connect', { url: SESSION_WS_PATH });
	socketRef = new WebSocket(SESSION_WS_PATH);

	socketRef.onopen = () => {
		reconnectAttempts = 0;
		logger.debug('ws:open', { url: SESSION_WS_PATH });
		const queue = [...pendingQueue];
		pendingQueue.length = 0;
		for (const item of queue) {
			try {
				socketRef?.send(JSON.stringify(item));
			} catch (_) {
				pendingQueue.unshift(item);
				break;
			}
		}
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
					participantsMeta: parsed.participantsMeta,
					adminsMeta: parsed.adminsMeta,
					system_message: parsed.system_message,
					image: parsed.image,
					chatKey: parsed.chatKey,
					room_id: parsed.room_id,
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

	socketRef.onerror = () => {
		logger.error('ws:error', { url: SESSION_WS_PATH });
	};

	socketRef.onclose = () => {
		socketRef = null;
		const room = currentRoomId;
		currentRoomId = null;
		if (room) {
			const delay = Math.min(1000 + reconnectAttempts * 1000, 10000);
			reconnectAttempts += 1;
			reconnectTimeout = setTimeout(() => {
				reconnectTimeout = null;
				connect(room);
			}, delay);
		}
	};
}

export function disconnect(): void {
	if (reconnectTimeout) {
		clearTimeout(reconnectTimeout);
		reconnectTimeout = null;
	}
	currentRoomId = null;
	pendingQueue.length = 0;
	if (socketRef) {
		socketRef.close();
		socketRef = null;
	}
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

export function state(): number | null {
	return socketRef?.readyState ?? null;
}

export function getCurrentRoomId(): string | null {
	return currentRoomId;
}

import { writable } from 'svelte/store';

export interface ChatMessage {
	id: number;
	author: string;
	content: string | null;
	image: string | null;
	timestamp: string;
	system_message?: boolean;
}

export interface Chat {
	id: number;
	name: string | null;
	participants: string[];
}

export interface RoomCache {
	messages: ChatMessage[];
	participants: string[];
	name: string | null;
	admins: string[];
	chatKey: string | null;
}

export const messages = writable<ChatMessage[]>([]);
export const chats = writable<Chat[]>([]);
export const participants = writable<string[]>([]);
export const participantsCount = writable(0);
export const chatName = writable<string | null>(null);
export const admins = writable<string[]>([]);
export const chatKey = writable<string | null>(null);
export const systemMessage = writable<string | null>(null);

let currentRoomId: string | null = null;
const roomCache = new Map<string, RoomCache>();

function emptyRoomCache(): RoomCache {
	return {
		messages: [],
		participants: [],
		name: null,
		admins: [],
		chatKey: null,
	};
}

export function setCurrentRoom(roomId: string | null): void {
	currentRoomId = roomId;
	if (!roomId) {
		messages.set([]);
		participants.set([]);
		participantsCount.set(0);
		chatName.set(null);
		admins.set([]);
		chatKey.set(null);
		return;
	}
	const cached = roomCache.get(roomId) ?? emptyRoomCache();
	messages.set(cached.messages);
	participants.set(cached.participants);
	participantsCount.set(cached.participants.length);
	chatName.set(cached.name);
	admins.set(cached.admins);
	chatKey.set(cached.chatKey);
}

export function setMessages(payload: {
	messages: ChatMessage[];
	participants: string[];
	name?: string;
	admins?: string[];
	chatKey?: string;
	system_message?: string;
	room_id?: string;
}) {
	const msgs = Array.isArray(payload.messages) ? [...payload.messages].reverse() : [];
	const roomId = payload.room_id ?? currentRoomId;
	const part = payload.participants ?? [];
	const adm = payload.admins ?? [];
	const cache: RoomCache = {
		messages: msgs,
		participants: part,
		name: payload.name ?? null,
		admins: adm,
		chatKey: payload.chatKey ?? null,
	};
	if (roomId) {
		roomCache.set(roomId, cache);
	}
	if (roomId === currentRoomId) {
		messages.set(msgs);
		participants.set(part);
		participantsCount.set(part.length);
		chatName.set(cache.name);
		admins.set(adm);
		chatKey.set(cache.chatKey);
		systemMessage.set(payload.system_message ?? null);
	}
}

export function addMessage(message: ChatMessage, forRoomId?: string): void {
	const roomId = forRoomId ?? currentRoomId;
	if (roomId) {
		const cached = roomCache.get(roomId) ?? emptyRoomCache();
		const next = [...cached.messages, message];
		roomCache.set(roomId, { ...cached, messages: next });
		if (roomId === currentRoomId) {
			messages.update((m) => [...m, message]);
		}
	} else {
		messages.update((m) => [...m, message]);
	}
}

export function setChats(list: Chat[]) {
	chats.set(list ?? []);
}

export function getCurrentRoomId(): string | null {
	return currentRoomId;
}

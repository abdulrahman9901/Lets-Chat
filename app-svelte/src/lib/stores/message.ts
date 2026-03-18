import { writable } from 'svelte/store';

export interface ChatMessage {
	id: number;
	author: string;
	content: string | null;
	image: string | null;
	timestamp: string;
	system_message?: boolean;
}

export interface ContactMeta {
	id: number;
	username: string;
}

export interface Chat {
	id: number;
	name: string | null;
	participants: string[];
	participantsMeta?: ContactMeta[];
	admins?: string[];
	adminsMeta?: ContactMeta[];
	chatKey?: string | null;
}

export interface RoomCache {
	messages: ChatMessage[];
	participants: string[];
	participantsMeta: ContactMeta[];
	name: string | null;
	admins: string[];
	adminsMeta: ContactMeta[];
	chatKey: string | null;
}

export const messages = writable<ChatMessage[]>([]);
export const chats = writable<Chat[]>([]);
export const participants = writable<string[]>([]);
export const participantsMeta = writable<ContactMeta[]>([]);
export const participantsCount = writable(0);
export const chatName = writable<string | null>(null);
export const admins = writable<string[]>([]);
export const adminsMeta = writable<ContactMeta[]>([]);
export const chatKey = writable<string | null>(null);
export const systemMessage = writable<string | null>(null);

let currentRoomId: string | null = null;
const roomCache = new Map<string, RoomCache>();

function emptyRoomCache(): RoomCache {
	return {
		messages: [],
		participants: [],
		participantsMeta: [],
		name: null,
		admins: [],
		adminsMeta: [],
		chatKey: null,
	};
}

export function setCurrentRoom(roomId: string | null): void {
	currentRoomId = roomId;
	if (!roomId) {
		messages.set([]);
		participants.set([]);
		participantsMeta.set([]);
		participantsCount.set(0);
		chatName.set(null);
		admins.set([]);
		adminsMeta.set([]);
		chatKey.set(null);
		return;
	}
	const cached = roomCache.get(roomId) ?? emptyRoomCache();
	messages.set(cached.messages);
	participants.set(cached.participants);
	participantsMeta.set(cached.participantsMeta);
	participantsCount.set(cached.participants.length);
	chatName.set(cached.name);
	admins.set(cached.admins);
	adminsMeta.set(cached.adminsMeta);
	chatKey.set(cached.chatKey);
}

export function setMessages(payload: {
	messages: ChatMessage[];
	participants: string[];
	participantsMeta?: ContactMeta[];
	name?: string;
	admins?: string[];
	adminsMeta?: ContactMeta[];
	chatKey?: string;
	system_message?: string;
	room_id?: string;
}) {
	const msgs = Array.isArray(payload.messages) ? [...payload.messages].reverse() : [];
	const roomId = payload.room_id ?? currentRoomId;
	const metaParticipants = Array.isArray(payload.participantsMeta) ? payload.participantsMeta : [];
	const metaAdmins = Array.isArray(payload.adminsMeta) ? payload.adminsMeta : [];
	const part =
		metaParticipants.length > 0 ? metaParticipants.map((p) => p.username) : (payload.participants ?? []);
	const adm = metaAdmins.length > 0 ? metaAdmins.map((a) => a.username) : (payload.admins ?? []);
	const cache: RoomCache = {
		messages: msgs,
		participants: part,
		participantsMeta: metaParticipants,
		name: payload.name ?? null,
		admins: adm,
		adminsMeta: metaAdmins,
		chatKey: payload.chatKey ?? null,
	};
	if (roomId) {
		roomCache.set(roomId, cache);
	}
	if (roomId === currentRoomId) {
		messages.set(msgs);
		participants.set(part);
		participantsMeta.set(metaParticipants);
		participantsCount.set(part.length);
		chatName.set(cache.name);
		admins.set(adm);
		adminsMeta.set(metaAdmins);
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

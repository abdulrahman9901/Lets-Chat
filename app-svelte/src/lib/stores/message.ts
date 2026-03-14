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

export const messages = writable<ChatMessage[]>([]);
export const chats = writable<Chat[]>([]);
export const participants = writable<string[]>([]);
export const participantsCount = writable(0);
export const chatName = writable<string | null>(null);
export const admins = writable<string[]>([]);
export const chatKey = writable<string | null>(null);
export const systemMessage = writable<string | null>(null);

export function setMessages(payload: {
	messages: ChatMessage[];
	participants: string[];
	name?: string;
	admins?: string[];
	chatKey?: string;
	system_message?: string;
}) {
	const msgs = Array.isArray(payload.messages) ? [...payload.messages].reverse() : [];
	messages.set(msgs);
	participants.set(payload.participants ?? []);
	participantsCount.set((payload.participants ?? []).length);
	chatName.set(payload.name ?? null);
	admins.set(payload.admins ?? []);
	chatKey.set(payload.chatKey ?? null);
	systemMessage.set(payload.system_message ?? null);
}

export function addMessage(message: ChatMessage) {
	messages.update((m) => [...m, message]);
}

export function setChats(list: Chat[]) {
	chats.set(list ?? []);
}

import { apiRequest, apiFormDataWithProgress } from './client';
import type { Chat } from '$lib/stores/message';

export interface UserSearchHit {
	id: number;
	username: string;
	email: string;
}

export async function searchUsers(q: string, limit = 20): Promise<UserSearchHit[]> {
	if (!q.trim()) return [];
	const params = new URLSearchParams({ q: q.trim(), limit: String(limit) });
	return apiRequest<UserSearchHit[]>(`/chat/users/search/?${params}`, { method: 'GET' });
}

export async function getChats(username: string): Promise<Chat[]> {
	return apiRequest<Chat[]>(`/chat/?username=${encodeURIComponent(username)}`, {
		method: 'GET',
	});
}

export async function createChat(params: {
	name: string;
	participants: string[];
	admins: string[];
}): Promise<{ id: number }> {
	return apiRequest<{ id: number }>('/chat/create/', {
		method: 'POST',
		body: {
			messages: [],
			admins: params.admins,
			participants: params.participants,
			name: params.name,
		},
	});
}

export async function joinChat(username: string, chatKey: string): Promise<{ data: { id: number } }> {
	return apiRequest<{ data: { id: number } }>('/chat/join/', {
		method: 'POST',
		body: { command: 'join', username, Chatkey: chatKey },
	});
}

export async function leaveChat(chatId: string, participantsWithoutSelf: string[]): Promise<unknown> {
	return apiRequest(`/chat/${chatId}/update/`, {
		method: 'PUT',
		body: {
			name: 'new name',
			messages: [],
			admins: [],
			participants: participantsWithoutSelf,
		},
	});
}

export async function kickMembers(
	chatId: string,
	participants: string[],
	admins: string[] = []
): Promise<unknown> {
	return apiRequest(`/chat/${chatId}/update/`, {
		method: 'PUT',
		body: {
			command: 'removeMember',
			username: localStorage.getItem('username'),
			messages: [],
			participants,
			admins,
		},
	});
}

export async function addParticipants(
	chatId: string,
	currentParticipants: string[],
	newUsernames: string[],
	asAdmin: boolean
): Promise<unknown> {
	const participants = [...currentParticipants, ...newUsernames];
	return apiRequest(`/chat/${chatId}/update/`, {
		method: 'PUT',
		body: {
			command: asAdmin ? 'addAdmin' : 'addParticipant',
			username: localStorage.getItem('username'),
			messages: [],
			participants,
			admins: asAdmin ? newUsernames : [],
		},
	});
}

export async function deleteChat(chatId: string): Promise<unknown> {
	return apiRequest(`/chat/${chatId}/delete/`, { method: 'DELETE' });
}

export async function uploadToChat(
	chatId: string,
	username: string,
	files: File[],
	onProgress?: (percent: number) => void
): Promise<unknown> {
	const form = new FormData();
	files.forEach((file, i) => form.append(`image_${i}`, file));
	form.append('username', username);
	form.append('chatid', chatId);
	return apiFormDataWithProgress('/chat/upload/', form, onProgress);
}

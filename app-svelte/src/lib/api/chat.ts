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

export async function leaveChat(chatId: string, actorId: number): Promise<unknown> {
	return apiRequest(`/chat/${chatId}/update/`, {
		method: 'PUT',
		body: {
			command: 'leave',
			actorId,
		},
	});
}

export async function kickMembers(chatId: string, actorId: number, removedIds: number[]): Promise<unknown> {
	return apiRequest(`/chat/${chatId}/update/`, {
		method: 'PUT',
		body: {
			command: 'removeMember',
			actorId,
			removedIds,
		},
	});
}

export async function addParticipants(
	chatId: string,
	actorId: number,
	addedIds: number[],
	asAdmin: boolean
): Promise<unknown> {
	return apiRequest(`/chat/${chatId}/update/`, {
		method: 'PUT',
		body: {
			command: 'addParticipant',
			actorId,
			addedIds,
			promotedIds: asAdmin ? addedIds : [],
		},
	});
}

export async function promoteToAdmins(
	chatId: string,
	actorId: number,
	promotedIds: number[]
): Promise<unknown> {
	return apiRequest(`/chat/${chatId}/update/`, {
		method: 'PUT',
		body: {
			command: 'promoteAdmin',
			actorId,
			promotedIds,
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

import { apiRequest, apiFormDataWithProgress } from './client';
import { logger } from '$lib/logger';
import { generateTraceId } from '$lib/utils/trace';
import type { Chat } from '$lib/stores/message';

export interface UserSearchHit {
	id: number;
	username: string;
	email: string;
}

async function chatUpdatePut(
	chatId: string,
	body: Record<string, unknown>,
	explicitTraceId?: string
): Promise<unknown> {
	const traceId = explicitTraceId ?? generateTraceId();
	const payload: Record<string, unknown> = { ...body, traceId };
	logger.info('chat:trace:PUT /chat/update', {
		traceId,
		chatId,
		command: payload['command'],
		actorId: payload['actorId'],
		promotedIds: payload['promotedIds'],
		promotedUsernames: payload['promotedUsernames'],
		addedIds: payload['addedIds'],
	});
	const result = await apiRequest(`/chat/${chatId}/update/`, {
		method: 'PUT',
		body: payload,
		traceId,
	});
	logger.info('chat:trace:PUT /chat/update ok', { traceId, chatId });
	return result;
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

export async function leaveChat(chatId: string, actorId: number, traceId?: string): Promise<unknown> {
	return chatUpdatePut(
		chatId,
		{
			command: 'leave',
			actorId,
		},
		traceId
	);
}

export async function kickMembers(
	chatId: string,
	actorId: number,
	removedIds: number[],
	traceId?: string
): Promise<unknown> {
	return chatUpdatePut(
		chatId,
		{
			command: 'removeMember',
			actorId,
			removedIds,
		},
		traceId
	);
}

export async function addParticipants(
	chatId: string,
	actorId: number,
	addedIds: number[],
	asAdmin: boolean,
	traceId?: string
): Promise<unknown> {
	return chatUpdatePut(
		chatId,
		{
			command: 'addParticipant',
			actorId,
			addedIds,
			promotedIds: asAdmin ? addedIds : [],
		},
		traceId
	);
}

export async function promoteToAdmins(
	chatId: string,
	promotedUsernames: string[],
	traceId?: string
): Promise<unknown> {
	return chatUpdatePut(
		chatId,
		{
			command: 'promoteAdmin',
			promotedUsernames,
		},
		traceId
	);
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

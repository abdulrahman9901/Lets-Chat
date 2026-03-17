import { writable } from 'svelte/store';

export const showAddChatPopup = writable(false);
export const showJoinChatPopup = writable(false);
export const showAddMemberPopup = writable(false);
export const showKickMemberPopup = writable(false);
export const showUploadPopup = writable(false);
export const showParticipantsPanel = writable(false);
export const showSidepanel = writable(false);

export function openAddChatPopup() {
	showAddChatPopup.set(true);
}
export function closeAddChatPopup() {
	showAddChatPopup.set(false);
}
export function openJoinChatPopup() {
	showJoinChatPopup.set(true);
}
export function closeJoinChatPopup() {
	showJoinChatPopup.set(false);
}
export function openAddMemberPopup() {
	showAddMemberPopup.set(true);
}
export function closeAddMemberPopup() {
	showAddMemberPopup.set(false);
}
export function openKickMemberPopup() {
	showKickMemberPopup.set(true);
}
export function closeKickMemberPopup() {
	showKickMemberPopup.set(false);
}
export function openUploadPopup() {
	showUploadPopup.set(true);
}
export function closeUploadPopup() {
	showUploadPopup.set(false);
}

export function openParticipantsPanel() {
	showParticipantsPanel.set(true);
}
export function closeParticipantsPanel() {
	showParticipantsPanel.set(false);
}

export function openSidepanel() {
	showSidepanel.set(true);
}
export function closeSidepanel() {
	showSidepanel.set(false);
}

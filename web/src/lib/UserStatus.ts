import { get, writable } from 'svelte/store';
import { batch, createRxBackwardReq, isExpired, uniq } from 'rx-nostr';
import { bufferTime, filter } from 'rxjs';
import type { Event } from 'nostr-typedef';
import { rxNostr } from './timelines/MainTimeline';
import { maxFilters } from './Constants';
import type { pubkey } from './Types';

export const userStatusesMap = writable(new Map<pubkey, Event[]>());

export const userStatusReq = createRxBackwardReq();
rxNostr
	.use(userStatusReq.pipe(bufferTime(1000, null, maxFilters), batch()))
	.pipe(
		uniq(),
		filter(({ event }) => !isExpired(event))
	)
	.subscribe((packet) => {
		console.debug('[user status]', packet, packet.event.pubkey, packet.event.content);
		updateUserStatus(packet.event);
	});

export function updateUserStatus(event: Event): void {
	const $userStatusesMap = get(userStatusesMap);
	const statuses = $userStatusesMap.get(event.pubkey);
	if (statuses === undefined) {
		$userStatusesMap.set(event.pubkey, [event]);
	} else {
		statuses.push(event);
		$userStatusesMap.set(
			event.pubkey,
			statuses.filter((status) => !isExpired(status))
		);
	}
	userStatusesMap.set($userStatusesMap);
}

export function userStatusReqEmit(pubkey: pubkey): void {
	console.debug('[user status emit]', pubkey);
	userStatusReq.emit({
		kinds: [30315],
		authors: [pubkey]
	});
}

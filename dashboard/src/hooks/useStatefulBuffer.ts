import { useRef } from "react";

import { merge } from "@/lib/merge";

import { useBuffer } from "@/hooks/useBuffer";

import type { RecursivePartial } from "@/types/message.type";

export const useStatefulBuffer = <T>() => {
	const currentRef = useRef<T | null>(null);
	const buffer = useBuffer<T>();

	const push = (update: RecursivePartial<T>) => {
		currentRef.current = merge(currentRef.current ?? {}, update) as T;
		if (currentRef.current) buffer.push(currentRef.current);
	};

	// Forget the accumulated state, so the next push starts from nothing.
	const reset = () => {
		currentRef.current = null;
		buffer.clear();
	};

	return {
		push,
		reset,
		latest: buffer.latest,
		delayed: buffer.delayed,
		cleanup: buffer.cleanup,
		maxDelay: buffer.maxDelay,
	};
};

"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";

const BANNER_IMAGES = [
//   "/hero_banner15.png",
  "/hero_banner17.png",
//   "/hero_banner16.png"
];

const STORAGE_KEY_QUEUE = "banner_fair_queue";
const STORAGE_KEY_LAST = "banner_last_shown";

/**
 * Generates a freshly shuffled deck of all image indices using Fisher-Yates shuffle.
 * Ensures the first card in the new deck does not repeat the last shown image.
 */
function createFairDeck(total: number, lastIndex: number | null): number[] {
  const deck = Array.from({ length: total }, (_, i) => i);

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // Ensure no immediate repetition across deck refills
  if (lastIndex !== null && deck[0] === lastIndex && deck.length > 1) {
    const swapTarget = 1 + Math.floor(Math.random() * (deck.length - 1));
    [deck[0], deck[swapTarget]] = [deck[swapTarget], deck[0]];
  }

  return deck;
}

/**
 * Shuffle-Bag (Permutation Queue) Algorithm:
 * Guarantees every image gets exactly one turn before any image repeats (100% fair distribution, 0% starvation).
 */
function getNextFairIndex(): number {
  try {
    let queue: number[] = [];
    const storedQueue = localStorage.getItem(STORAGE_KEY_QUEUE);
    const storedLast = localStorage.getItem(STORAGE_KEY_LAST);
    const lastIndex = storedLast !== null ? parseInt(storedLast, 10) : null;

    if (storedQueue) {
      try {
        const parsed = JSON.parse(storedQueue);
        if (Array.isArray(parsed) && parsed.length > 0) {
          queue = parsed.filter((idx) => typeof idx === "number" && idx >= 0 && idx < BANNER_IMAGES.length);
        }
      } catch {
        queue = [];
      }
    }

    // If the fair bag is exhausted or empty, refill with a fresh shuffled deck
    if (queue.length === 0) {
      queue = createFairDeck(BANNER_IMAGES.length, lastIndex);
    }

    const nextIndex = queue.shift()!;
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
    localStorage.setItem(STORAGE_KEY_LAST, nextIndex.toString());

    return nextIndex;
  } catch {
    // Fallback if localStorage is disabled/restricted
    return Math.floor(Math.random() * BANNER_IMAGES.length);
  }
}

export default function HeroBanner() {
  const [index, setIndex] = useState(0);
  const isFirstThemeCheck = useRef(true);

  // 1. Pick fair image on load & preload all banner images in background
  useEffect(() => {
    // Preload all banner images immediately into browser cache
    BANNER_IMAGES.forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });

    const nextIdx = getNextFairIndex();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(nextIdx);
  }, []);

  // 2. Listen to theme toggle events to draw the next fair image with zero delay
  useEffect(() => {
    const root = document.documentElement;
    let lastIsDark = root.classList.contains("dark");

    const observer = new MutationObserver(() => {
      const currentIsDark = root.classList.contains("dark");
      if (currentIsDark !== lastIsDark) {
        lastIsDark = currentIsDark;
        if (isFirstThemeCheck.current) {
          isFirstThemeCheck.current = false;
          return;
        }

        // Advance to next fair image in the permutation queue
        const nextIdx = getNextFairIndex();
        setIndex(nextIdx);
      }
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const timer = setTimeout(() => {
      isFirstThemeCheck.current = false;
    }, 100);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="flex flex-col justify-end">
    <div className="relative w-full aspect-2/1 sm:aspect-[1.5/1] mb-6 md:mb-8 overflow-hidden rounded-lg mx-auto bg-black/5 dark:bg-white/5">
      {BANNER_IMAGES.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt="Hero Banner"
          fill
          priority={i === 0 || i === index}
          className={`object-cover transition-opacity duration-300 ease-in-out ${
            i === index ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          }`}
          sizes="(max-width: 720px) 100vw, 720px"
        />
        
      ))}
    </div>
    {/* <p className="text-sm mb-5" style={{ color: "var(--fg-muted)" }}>
            To Infinity And Beyond
        </p> */}
    </div>
  );
}

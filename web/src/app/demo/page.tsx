"use client";

import React from "react";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { GlowingButton as GlowButton } from "@/components/ui/button-1";

export default function DemoPage() {
  const handleSendMessage = (message: string, files?: File[]) => {
    console.log("Message:", message);
    console.log("Files:", files);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
      <div className="w-full max-w-2xl space-y-12 text-center">
        <header className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Component Showcase
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Testing the AI Prompt Box and Glowing Button in both White and Dark themes.
          </p>
        </header>

        <section className="p-12 rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-gray-100 dark:border-gray-800 flex flex-col items-center gap-8">
          <div className="w-full">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-6">
              AI Prompt Box
            </h2>
            <PromptInputBox 
              onSend={handleSendMessage} 
              placeholder="Type your instruction or drop an image..."
            />
          </div>

          <div className="pt-8 w-full">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-6">
              Glowing Action Button
            </h2>
            <GlowButton>Activate Engine</GlowButton>
          </div>
        </section>

        <footer className="pt-8 flex gap-4 justify-center">
          <button
            onClick={() => document.documentElement.classList.toggle("dark")}
            className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Toggle Theme
          </button>
          <a
            href="/demo/login"
            className="px-4 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            View Login Page
          </a>
        </footer>
      </div>
    </div>
  );
}

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['pwa-icon.svg', 'pwa-192.png', 'pwa-512.png'],
			manifest: {
				name: 'Lets Chat',
				short_name: 'LetsChat',
				description: 'Secure chat for teams and friends.',
				theme_color: '#050816',
				background_color: '#050816',
				display: 'standalone',
				start_url: '/',
				scope: '/',
				icons: [
					{
						src: '/pwa-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: '/pwa-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/pwa-icon.svg',
						sizes: 'any',
						type: 'image/svg+xml',
						purpose: 'any maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}']
			},
			devOptions: {
				enabled: true
			}
		})
	],
	test: {
		environment: 'jsdom',
		globals: true,
		include: ['src/**/*.test.ts']
	}
});

# Dark PDF

A web app for reading PDFs comfortably in dark mode with customizable filters.

## Features

- **Dark Mode Filters** - Adjustable inversion, brightness, contrast, and sepia
- **Export with Filters** - Save PDFs with your filter settings applied
- **Presets** - Save and load your favorite filter configurations
- **Keyboard Shortcuts** - Navigate and zoom with keyboard
- **URL or File Upload** - Load PDFs from URLs or local files
- **CORS Proxy** - Built-in proxy for loading PDFs from external URLs
- **Responsive** - Works on desktop and mobile

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ← / → | Previous / Next page |
| + / - | Zoom in / out |
| r | Rotate |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/dark-pdf.git
cd dark-pdf

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/dark-pdf)

The app deploys seamlessly to Vercel with zero configuration.

### Other Platforms

The app is a standard Next.js application and can be deployed to any platform that supports Node.js.

## Tech Stack

- [Next.js 16](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF rendering (loaded from CDN)
- [jsPDF](https://github.com/parallax/jsPDF) - PDF export

## Project Structure

```
├── app/
│   ├── api/pdf-proxy/    # CORS proxy for external PDFs
│   ├── layout.tsx        # Root layout with metadata
│   └── page.tsx          # Main application page
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── filter-controls.tsx
│   ├── pdf-input.tsx
│   ├── pdf-viewer.tsx
│   ├── pdf-viewer-inner.tsx
│   └── preset-manager.tsx
└── lib/
    └── utils.ts
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Ideas for Contributions

- [ ] Text selection and search
- [ ] Bookmarks / table of contents
- [ ] Multi-page view
- [ ] Annotation support
- [ ] Import/export presets as JSON
- [ ] More filter options (hue rotation, grayscale)
- [ ] PWA support for offline use
- [ ] Drag to reorder preset list

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [PDF.js](https://mozilla.github.io/pdf.js/) by Mozilla
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful components

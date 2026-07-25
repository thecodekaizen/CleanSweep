# Mac Cleaner

A professional, open-source macOS system optimization and cleaning utility built with modern web technologies. Safely reclaim disk space by clearing out unneeded application caches, system logs, and old trash bin contents.

## Features
- **Modern Interface:** Built with React and designed to seamlessly blend in with Apple's Human Interface Guidelines. Light and Dark mode supported.
- **Safe Deletion:** Instead of hard-deleting files, Mac Cleaner utilizes native macOS APIs to move files to your Trash bin, ensuring you never accidentally lose important data.
- **Deep Scanning:** Analyzes standard cache and log directories, accurately computing total sizes, while gracefully skipping inaccessible, restricted system files.

## Technology Stack
- **Frontend:** React, Vite, Lucide Icons
- **Backend:** Electron (Node.js)
- **Styling:** CSS Variables (Apple HIG Design System)
- **Packaging:** electron-builder

## Installation & Development

### Requirements
- Node.js (v18+)
- macOS (for native directories and Trash API)

### Running Locally
1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application in development mode:
   ```bash
   npm run dev
   ```

### Building for Production
To package the app into a macOS `.dmg` and `.zip` file for distribution:
```bash
npm run build
```
The packaged application will be available in the `dist-electron/release` directory.

## Contributing
Contributions are welcome. Please ensure that UI modifications match the established design language before submitting a pull request.

## License
MIT License.

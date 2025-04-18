# JSON Editor

A desktop application for editing and validating JSON files with tree view and schema validation.

<img width="1728" alt="Screenshot 2025-04-18 at 22 22 07" src="https://github.com/user-attachments/assets/38417a86-1112-4ed5-ab23-bf2afff363e8" />
<img width="1722" alt="Screenshot 2025-04-18 at 22 21 59" src="https://github.com/user-attachments/assets/b6f5651a-b381-4e6d-a6b0-f1f797a447b8" />
<img width="1728" alt="Screenshot 2025-04-18 at 22 21 50" src="https://github.com/user-attachments/assets/abddf08c-148d-4440-9663-adbea01be260" />
<img width="1725" alt="Screenshot 2025-04-18 at 22 21 42" src="https://github.com/user-attachments/assets/968636cf-5c0c-4108-9bee-5909c3e06109" />


## Features

- Edit JSON with syntax highlighting
- Format and compress JSON
- Validate JSON syntax
- Tree view for easier navigation
- Validate against JSON Schema
- Generate JSON Schema from current JSON
- Search within JSON content
- Import/Export functionality

## Development

### Setup

```bash
# Install dependencies
npm install

# Run the app
npm start
```

### Building the App

```bash
# Package the app for macOS
npm run package
```

## Customizing App Icon

To update the application icon:

1. Replace the SVG file in `build/icons/icon.svg` with your own design
2. Convert the SVG to various PNG sizes using an online converter like [SVG to PNG Converter](https://svgtopng.com/)
3. Save the main icon as `build/icons/icon.png` (1024x1024 pixels recommended)
4. For macOS, create an .icns file using the converted PNG files
5. Update the `icon` path in `package.json` and `main.js` if needed
6. Rebuild the application

### macOS Icon Sizes

For macOS .icns file, you'll need the following sizes:
- 16x16
- 32x32
- 64x64
- 128x128
- 256x256
- 512x512
- 1024x1024

## License

MIT 
